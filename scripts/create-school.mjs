// Creates a school + its owner login WITHOUT Cloud Functions, so Steerly can run on the free
// Firebase (Spark) plan. Mirrors the createSchool callable in functions/src/onboarding.ts.
//
// Usage (real project — needs a service-account key, which works on the free plan):
//   PowerShell:  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\steerly-service-account.json"
//   npm run create-school -- --name "Prince Driving School" --city Pune --phone 9876543210 \
//       --owner-name "Prince Sharma" --owner-email owner@example.com [--address "Karve Road, Kothrud"]
//
// Against the local emulators instead: add --emulator (uses project demo-steerly).
//
// It prints a one-time "set your password" link for the owner. Open it, choose a password, then
// sign in to the admin dashboard with that email.
import { randomInt } from 'node:crypto';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ---------- args ----------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[key] = true;
  else args[key] = process.argv[++i];
}
const usage = 'Usage: npm run create-school -- --name "School" --city City --phone 9876543210 --owner-name "Name" --owner-email you@example.com [--address "..."] [--emulator]';
const required = ['name', 'city', 'phone', 'owner-name', 'owner-email'];
const missing = required.filter((k) => typeof args[k] !== 'string' || !args[k].trim());
if (missing.length) {
  console.error(`Missing: ${missing.map((m) => `--${m}`).join(', ')}\n${usage}`);
  process.exit(1);
}
const phone10 = String(args.phone).replace(/\D/g, '').slice(-10);
if (!/^[6-9]\d{9}$/.test(phone10)) {
  console.error('--phone must be a 10-digit Indian mobile number.');
  process.exit(1);
}
const email = String(args['owner-email']).trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('--owner-email is not a valid email address.');
  process.exit(1);
}
const input = {
  name: String(args.name).trim(),
  city: String(args.city).trim(),
  address: typeof args.address === 'string' ? args.address.trim() : '',
  ownerName: String(args['owner-name']).trim(),
};

// ---------- firebase ----------
if (args.emulator) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  initializeApp({ projectId: 'demo-steerly' });
} else {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key file first (see docs/FIREBASE_FREE_SETUP.md).');
    process.exit(1);
  }
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();
const auth = getAuth();

// ---------- helpers (same rules as functions/src/lib/codes.ts) ----------
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = (len = 6) => Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
const slugify = (s) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/g, '') || 'school';
const slugCandidates = (name, city) => {
  const base = slugify(name);
  const withCity = slugify(`${name} ${city}`);
  const list = [base];
  if (withCity !== base) list.push(withCity);
  for (let i = 0; i < 3; i++) list.push(`${base}-${generateCode(4).toLowerCase()}`);
  return list;
};
const receiptPrefixFromName = (name) => {
  const words = name.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
  let prefix = words.map((w) => w[0]).join('').slice(0, 4);
  if (prefix.length < 2) prefix = (words[0] ?? '').slice(0, 3);
  return prefix.length >= 2 ? prefix : 'STR';
};

// Same as DEFAULT_SCHOOL_SETTINGS / TRIAL_DAYS in packages/shared/src/firestore.ts
const DEFAULT_SCHOOL_SETTINGS = {
  lessonMinutes: 60,
  cancelBeforeHours: 6,
  maxBookingsPerDay: 1,
  bookingWindowDays: 14,
  gstin: null,
  gstPercent: 0,
  upiId: null,
  receiptPrefix: 'STR',
};
const TRIAL_DAYS = 14;
const DEFAULT_COURSES = [
  { name: 'Beginner Car Driving (Manual)', description: 'Learn to drive a manual car from scratch: controls, clutch, traffic, parking and the RTO test.', vehicleType: 'car_manual', sessions: 15, sessionMinutes: 60, price: 550000, active: true, order: 1 },
  { name: 'Beginner Car Driving (Automatic)', description: 'Learn to drive an automatic car with confidence in city traffic.', vehicleType: 'car_auto', sessions: 15, sessionMinutes: 60, price: 650000, active: true, order: 2 },
  { name: 'Two-wheeler Training', description: 'Balance, gears, traffic rules and test preparation for scooters and motorcycles.', vehicleType: 'two_wheeler', sessions: 10, sessionMinutes: 60, price: 250000, active: true, order: 3 },
];

// ---------- owner login ----------
let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`Using existing login ${email}`);
} catch (err) {
  if (err.code !== 'auth/user-not-found') throw err;
  user = await auth.createUser({ email, displayName: input.ownerName, emailVerified: false });
  console.log(`Created login ${email}`);
}
if (user.customClaims?.schoolId) {
  console.error(`${email} already belongs to school ${user.customClaims.schoolId}. Nothing changed.`);
  process.exit(1);
}

// ---------- school ----------
const now = Date.now();
const schoolRef = db.collection('schools').doc();
const schoolId = schoolRef.id;
const code = await db.runTransaction(async (tx) => {
  let slug = null;
  for (const c of slugCandidates(input.name, input.city)) {
    if (!(await tx.get(db.doc(`schoolSlugs/${c}`))).exists) { slug = c; break; }
  }
  let joinCode = null;
  for (let i = 0; i < 8 && !joinCode; i++) {
    const c = generateCode(6);
    if (!(await tx.get(db.doc(`schoolCodes/${c}`))).exists) joinCode = c;
  }
  if (!slug || !joinCode) throw new Error('Could not find a free slug/code, please run again.');
  const userDocRef = db.doc(`users/${user.uid}`);
  const userDoc = await tx.get(userDocRef);

  tx.create(schoolRef, {
    id: schoolId,
    name: input.name,
    slug,
    code: joinCode,
    logoUrl: null,
    brandColor: '#F59E0B',
    phone: phone10,
    email,
    address: input.address,
    city: input.city,
    ownerUid: user.uid,
    settings: { ...DEFAULT_SCHOOL_SETTINGS, receiptPrefix: receiptPrefixFromName(input.name) },
    subscription: {
      plan: 'starter',
      status: 'trial',
      trialEndsAt: Timestamp.fromMillis(now + TRIAL_DAYS * 86_400_000),
      currentPeriodEnd: null,
      razorpaySubscriptionId: null,
    },
    createdAt: Timestamp.fromMillis(now),
  });
  const lookup = { schoolId, name: input.name };
  tx.create(db.doc(`schoolSlugs/${slug}`), lookup);
  tx.create(db.doc(`schoolCodes/${joinCode}`), lookup);
  tx.set(db.doc(`schools/${schoolId}/members/${user.uid}`), {
    uid: user.uid,
    name: input.ownerName,
    phone: `+91${phone10}`,
    email,
    role: 'owner',
    active: true,
    teaches: false,
    createdAt: Timestamp.fromMillis(now),
  });
  for (const course of DEFAULT_COURSES) {
    const c = db.collection(`schools/${schoolId}/courses`).doc();
    tx.set(c, { ...course, id: c.id });
  }
  const userData = {
    uid: user.uid,
    name: input.ownerName,
    phone: user.phoneNumber ?? null,
    email,
    role: 'owner',
    schoolId,
    studentId: null,
    expoPushToken: null,
    createdAt: Timestamp.fromMillis(now),
  };
  if (userDoc.exists) tx.update(userDocRef, { name: userDoc.data().name || input.ownerName, role: 'owner', schoolId });
  else tx.set(userDocRef, userData);
  return { joinCode, slug };
});

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: 'owner', schoolId });

let resetLink = '(emulator: set a password in the Emulator UI → Authentication)';
try {
  resetLink = await auth.generatePasswordResetLink(email);
} catch (err) {
  if (!args.emulator) console.warn(`Could not create a password link (${err.message}). Use "Forgot password?" on the login page instead.`);
}

console.log(`
School created ✔
  Name:        ${input.name}
  School ID:   ${schoolId}
  Join code:   ${code.joinCode}
  Public page: /s/${code.slug}
  Owner:       ${input.ownerName} <${email}>

Next: open this link once to choose the owner's password, then sign in to the admin dashboard with the email:
  ${resetLink}
`);
process.exit(0);
