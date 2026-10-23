// Demo data for the local Firebase emulators: "Prince Driving School" (Pune).
//   Terminal 1: npm run emulators
//   Terminal 2: node scripts/seed.mjs        (or: npm run seed)
// One-shot alternative (data is discarded when it exits):
//   npx firebase emulators:exec --project demo-steerly --only auth,functions,firestore,storage "node scripts/seed.mjs"
//
// Only ever talks to the emulators (project demo-steerly; demo-* projects cannot reach production).
// Real callables are used for anything with business rules (school, invites, students, slots, bookings,
// payments + receipts); firebase-admin writes the history (past lessons, ratings, dates, vehicles).
import { initializeApp as initClient, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';

const PROJECT = 'demo-steerly';
const REGION = 'asia-south1';
const HOST = '127.0.0.1';

// ---------- safety: emulators only ----------
const isLocal = (v) => !v || /^(127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0):\d+$/.test(v);
for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!isLocal(process.env[name])) {
    console.error(`Refusing to seed: ${name}=${process.env[name]} is not a local emulator.`);
    process.exit(1);
  }
}
process.env.FIRESTORE_EMULATOR_HOST ??= `${HOST}:8080`;
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${HOST}:9099`;
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= `${HOST}:9199`;
process.env.GCLOUD_PROJECT = PROJECT;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
try {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/`);
} catch {
  console.error(`Firestore emulator not reachable at ${process.env.FIRESTORE_EMULATOR_HOST}. Start it with: npm run emulators`);
  process.exit(1);
}

const admin = initAdmin({ projectId: PROJECT, storageBucket: `${PROJECT}.appspot.com` });
const adb = getAdminDb(admin);

// ---------- helpers ----------
const DAY = 86400e3;
const now = Date.now();
const istYmd = (ms) => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10);
const istAt = (ymd, hm) => Date.parse(`${ymd}T${hm}:00+05:30`);
const addYmd = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const today = istYmd(now);
const ts = (ms) => Timestamp.fromMillis(ms);
let seedRand = 42;
const rand = () => ((seedRand = (seedRand * 16807) % 2147483647) / 2147483647); // deterministic
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const apps = [];
function actor(name) {
  const app = initClient({ apiKey: 'demo-key', projectId: PROJECT, authDomain: `${PROJECT}.firebaseapp.com` }, `seed-${name}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  const fns = getFunctions(app, REGION);
  connectFunctionsEmulator(fns, HOST, 5001);
  const call = async (fn, data) => (await httpsCallable(fns, fn, { timeout: 120e3 })(data)).data;
  return {
    auth,
    call,
    async login(phone10) {
      const { devCode } = await call('requestOtp', { phone: phone10 });
      if (!devCode) throw new Error('requestOtp returned no devCode — set OTP_DEV_MODE=true in functions/.env.local');
      const { token } = await call('verifyOtp', { phone: phone10, code: devCode });
      await signInWithCustomToken(auth, token);
      return (await auth.currentUser.getIdTokenResult(true)).claims;
    },
  };
}
const log = (msg) => console.log(`  • ${msg}`);

const OWNER = { phone: '9000000001', name: 'Prince Sharma' };
const INSTRUCTORS = [
  { phone: '9000000002', name: 'Rahul Patil' },
  { phone: '9000000003', name: 'Sneha Kulkarni' },
];

function printLogins(schoolId, code, students) {
  console.log(`
Prince Driving School is ready (schoolId ${schoolId}, join code ${code}).

Logins (phone OTP). In the emulator the OTP is shown by the app (OTP_DEV_MODE); numbers listed in
OTP_TEST_NUMBERS in functions/.env.local always accept 123456.
  Owner (admin dashboard)   ${OWNER.phone}   ${OWNER.name}
  Instructor (mobile)       ${INSTRUCTORS[0].phone}   ${INSTRUCTORS[0].name}
  Instructor (mobile)       ${INSTRUCTORS[1].phone}   ${INSTRUCTORS[1].name}
${students.slice(0, 3).map((s) => `  Student (mobile)          ${s.phone}   ${s.name}`).join('\n')}
  (all students: 9000000011 … 90000000${10 + students.length})
`);
}

// ---------- already seeded? ----------
const existing = await adb.collection('users').where('phone', '==', `+91${OWNER.phone}`).limit(1).get();
if (!existing.empty && existing.docs[0].get('schoolId')) {
  const sid = existing.docs[0].get('schoolId');
  const school = (await adb.doc(`schools/${sid}`).get()).data();
  const st = await adb.collection(`schools/${sid}/students`).orderBy('phone').get();
  console.log('Demo data already present — nothing to do.');
  printLogins(sid, school?.code, st.docs.map((d) => d.data()));
  process.exit(0);
}

console.log('\nSeeding Prince Driving School into the emulators…');

// ---------- school + team ----------
const owner = actor('owner');
await owner.login(OWNER.phone);
const { schoolId, code } = await owner.call('createSchool', {
  name: 'Prince Driving School',
  city: 'Pune',
  phone: OWNER.phone,
  address: 'Shop 4, Mayur Complex, Karve Road, Kothrud, Pune 411038',
  ownerName: OWNER.name,
});
await owner.auth.currentUser.getIdToken(true);
const S = (sub) => `schools/${schoolId}/${sub}`;
const ownerUid = owner.auth.currentUser.uid;
await adb.doc(`schools/${schoolId}`).update({
  brandColor: '#DC2626',
  email: 'hello@princedrivingschool.in',
  'settings.upiId': 'princedriving@okicici',
  'settings.receiptPrefix': 'PDS',
  'settings.bookingWindowDays': 14,
});
log(`school ${schoolId} (code ${code}), 14-day trial`);

const instructorUids = [];
for (const ins of INSTRUCTORS) {
  await owner.call('inviteMember', { schoolId, phone: ins.phone, name: ins.name, role: 'instructor' });
  const a = actor(ins.phone);
  const claims = await a.login(ins.phone);
  if (claims.role !== 'instructor') throw new Error(`${ins.name} was not linked as instructor`);
  instructorUids.push(a.auth.currentUser.uid);
}
const instructors = INSTRUCTORS.map((ins, i) => ({ ...ins, uid: instructorUids[i] }));
log('2 instructors invited and signed in');

// ---------- courses, vehicles, availability ----------
const courses = (await adb.collection(S('courses')).orderBy('order').get()).docs.map((d) => d.data());
const [manual, automatic, twoWheeler] = courses;
log(`${courses.length} courses: ${courses.map((c) => c.name).join(', ')}`);

const vehicles = [
  { id: 'swift-mh12ab4521', regNumber: 'MH12AB4521', model: 'Maruti Suzuki Swift (Manual)', type: 'car_manual',
    insuranceExpiry: ts(istAt(addYmd(today, 7), '00:00')), pucExpiry: ts(istAt(addYmd(today, 95), '00:00')), fitnessExpiry: ts(istAt(addYmd(today, 400), '00:00')) },
  { id: 'baleno-mh12cd7788', regNumber: 'MH12CD7788', model: 'Maruti Suzuki Baleno (Automatic)', type: 'car_auto',
    insuranceExpiry: ts(istAt(addYmd(today, 210), '00:00')), pucExpiry: ts(istAt(addYmd(today, 45), '00:00')), fitnessExpiry: null },
];
for (const v of vehicles) await adb.doc(`${S('vehicles')}/${v.id}`).set({ ...v, branchId: null, active: true });
log('2 vehicles (Swift insurance expires in 7 days)');

const range = (start, end) => [{ start, end }];
const availability = [
  { uid: instructors[0].uid, vehicleId: vehicles[0].id, day: [{ start: '07:00', end: '11:00' }, { start: '16:00', end: '19:00' }], sun: [] },
  { uid: instructors[1].uid, vehicleId: vehicles[1].id, day: range('08:00', '12:00'), sun: range('09:00', '11:00') },
];
for (const a of availability) {
  const weekly = { mon: a.day, tue: a.day, wed: a.day, thu: a.day, fri: a.day, sat: a.day, sun: a.sun };
  await adb.doc(`${S('availability')}/${a.uid}`).set({ instructorId: a.uid, weekly, vehicleId: a.vehicleId, updatedAt: Timestamp.now() });
  await owner.call('generateSlots', { schoolId, instructorId: a.uid, from: today, to: addYmd(today, 6) });
}
log('weekly availability set, slots generated for the next 7 days');

// ---------- enquiries ----------
const ENQUIRIES = [
  // name, phone, course, source, status, daysAgo, followUp (days from today | null), notes
  ['Aditya Deshmukh', '9000000011', manual, 'web', 'Contacted', 28, null, 'Wants morning batch'],
  ['Priya Joshi', '9000000012', automatic, 'app', 'Contacted', 26, null, ''],
  ['Rohan Kale', '9000000013', manual, 'walk_in', 'Contacted', 25, null, 'Came with father'],
  ['Neha Gokhale', '9000000014', twoWheeler, 'referral', 'Contacted', 22, null, 'Referred by Aditya'],
  ['Siddharth Pawar', '9000000015', manual, 'phone', 'Contacted', 20, null, ''],
  ['Ananya Bhosale', '9000000031', automatic, 'web', 'New', 1, null, ''],
  ['Kunal Shinde', '9000000032', manual, 'app', 'New', 0, null, ''],
  ['Meera Apte', '9000000033', twoWheeler, 'web', 'New', 2, null, ''],
  ['Varun Jadhav', '9000000034', manual, 'phone', 'Contacted', 4, 0, 'Call back after 6 pm'],
  ['Isha Ranade', '9000000035', automatic, 'walk_in', 'Contacted', 6, 0, 'Comparing prices'],
  ['Omkar Thorat', '9000000036', manual, 'referral', 'Contacted', 3, 1, 'Needs weekend slots'],
  ['Pooja Wagh', '9000000037', twoWheeler, 'app', 'Contacted', 9, 3, ''],
  ['Harsh Mehta', '9000000038', automatic, 'web', 'Lost', 18, null, 'Joined another school'],
  ['Tanvi Kulkarni', '9000000039', manual, 'phone', 'Lost', 15, null, 'Moved to Mumbai'],
  ['Yash Gaikwad', '9000000040', manual, 'walk_in', 'New', 0, null, 'Walk-in, wants a demo drive'],
];
const enquiryIds = {};
for (const [name, phone, course, source, status, daysAgo, followUp, notes] of ENQUIRIES) {
  const ref = adb.collection(S('enquiries')).doc();
  const createdAt = now - daysAgo * DAY - Math.floor(rand() * 8) * 3600e3;
  await ref.set({
    id: ref.id, name, phone, courseId: course.id, courseName: course.name,
    preferredTime: pick(['Morning', 'Evening', 'Weekends', 'Any time']), status, source, notes,
    followUpAt: followUp === null ? null : ts(istAt(addYmd(today, followUp), '11:00')),
    studentId: null, createdAt: ts(createdAt), updatedAt: status === 'New' ? null : ts(createdAt + DAY),
  });
  enquiryIds[phone] = ref.id;
}
log(`${ENQUIRIES.length} enquiries across sources and statuses`);

// ---------- students ----------
// [name, phone, course, instructorIdx, completedLessons, extra]
const STUDENTS = [
  ['Aditya Deshmukh', '9000000011', manual, 0, 13, { llStatus: 'passed', llNumber: 'MH12/2026/0012345', dlStatus: 'scheduled', dlTestDays: 9 }],
  ['Priya Joshi', '9000000012', automatic, 1, 15, { llStatus: 'passed', llNumber: 'MH12/2026/0011872', dlStatus: 'passed', dlNumber: 'MH1220260004411' }],
  ['Rohan Kale', '9000000013', manual, 0, 8, { llStatus: 'scheduled', llTestDays: 1 }],
  ['Neha Gokhale', '9000000014', twoWheeler, 1, 4, { llStatus: 'applied' }],
  ['Siddharth Pawar', '9000000015', manual, 0, 2, {}],
  ['Kavya Iyer', '9000000016', automatic, 1, 10, { llStatus: 'passed', llNumber: 'MH12/2026/0010555' }],
  ['Arjun Nair', '9000000017', manual, 0, 6, { llStatus: 'passed', llNumber: 'MH12/2026/0013009' }],
  ['Sakshi More', '9000000018', twoWheeler, 1, 9, { llStatus: 'passed', llNumber: 'MH12/2026/0012990', dlStatus: 'applied' }],
  ['Nikhil Salunkhe', '9000000019', manual, 0, 0, {}],
  ['Riya Chavan', '9000000020', automatic, 1, 3, { llStatus: 'failed' }],
  ['Manish Tiwari', '9000000021', manual, 0, 5, { dropped: true }],
  ['Shruti Pande', '9000000022', automatic, 1, 1, { feeTotal: 600000 }],
];
const students = [];
for (const [name, phone, course, insIdx, completed, extra] of STUDENTS) {
  const base = { schoolId, courseId: course.id, instructorId: instructors[insIdx].uid, ...(extra.feeTotal ? { feeTotal: extra.feeTotal } : {}) };
  const out = enquiryIds[phone]
    ? await owner.call('convertEnquiry', { ...base, enquiryId: enquiryIds[phone] })
    : await owner.call('createStudent', { ...base, name, phone, email: null });
  students.push({ id: out.studentId, name, phone, course, instructor: instructors[insIdx], completed, extra });
}
log(`${students.length} students (5 converted from enquiries)`);

// ---------- lesson history (admin SDK) ----------
const SKILL_ORDER = ['controls', 'steering', 'starting_stopping', 'clutch', 'turns', 'rules', 'reversing', 'traffic', 'parking', 'hill', 'highway', 'night'];
const NOTES = [
  'Good control, keep practising smooth clutch release.',
  'Nervous in traffic at first, much better by the end.',
  'Needs to check mirrors before turning.',
  'Excellent lesson — confident on Karve Road.',
  'Practised reverse parking near Kothrud depot.',
  'Hill start on Chandni Chowk slope, stalled twice then nailed it.',
  'Worked on lane discipline and signalling.',
];
const FEEDBACK = ['Very patient instructor!', 'Learnt a lot today', 'Great session', null, null, 'Explains clearly'];
const nextFree = new Map(); // instructor uid -> set of used start ms
let lessons = 0;
for (const st of students) {
  const totalPast = st.completed + (st.completed >= 4 ? 1 : 0); // one no-show for regulars
  const firstDay = Math.min(45, totalPast * 2 + 3);
  const skills = {};
  let completedSoFar = 0;
  const used = nextFree.get(st.instructor.uid) ?? new Set();
  nextFree.set(st.instructor.uid, used);
  for (let i = 0; i < totalPast; i++) {
    const noShow = st.completed >= 4 && i === 2;
    const dayOffset = -firstDay + Math.round((i * (firstDay - 1)) / Math.max(1, totalPast));
    let start;
    for (let h = 0; ; h++) {
      const hour = ['07:00', '08:00', '09:00', '10:00', '16:00', '17:00', '18:00'][h % 7];
      start = istAt(addYmd(today, dayOffset - Math.floor(h / 7)), hour);
      if (!used.has(start)) break;
    }
    used.add(start);
    const slotId = `${st.instructor.uid}_${start}`;
    const bookingRef = adb.collection(S('bookings')).doc();
    const covered = noShow ? [] : SKILL_ORDER.slice(Math.max(0, Math.floor(completedSoFar / 2) - 1), Math.floor(completedSoFar / 2) + 2);
    if (!noShow) {
      completedSoFar++;
      for (const s of covered) skills[s] = Math.min(3, (skills[s] ?? 0) + 1);
    }
    const rating = noShow ? null : rand() < 0.75 ? pick([4, 5, 5, 5, 4, 3]) : null;
    await adb.doc(`${S('slots')}/${slotId}`).set({
      id: slotId, instructorId: st.instructor.uid, instructorName: st.instructor.name, vehicleId: null,
      start: ts(start), end: ts(start + 3600e3), status: 'booked', bookingId: bookingRef.id,
    });
    await bookingRef.set({
      id: bookingRef.id, slotId, studentId: st.id, studentName: st.name, studentPhone: st.phone,
      instructorId: st.instructor.uid, instructorName: st.instructor.name, vehicleId: null,
      start: ts(start), end: ts(start + 3600e3), status: noShow ? 'no_show' : 'completed',
      cancelledBy: null, cancelReason: null, skillsCovered: covered, instructorNotes: noShow ? 'Student did not turn up.' : pick(NOTES),
      rating, feedback: rating ? pick(FEEDBACK) : null, reminderSent: true, createdAt: ts(start - 3 * DAY),
    });
    lessons++;
  }
  const x = st.extra;
  const done = st.completed >= st.course.sessions;
  await adb.doc(`${S('students')}/${st.id}`).update({
    sessionsCompleted: st.completed,
    skills,
    status: x.dropped ? 'dropped' : done ? 'completed' : 'active',
    enrolledAt: ts(now - (firstDay + 2) * DAY),
    createdAt: ts(now - (firstDay + 2) * DAY),
    address: pick(['Kothrud, Pune', 'Karve Nagar, Pune', 'Warje, Pune', 'Erandwane, Pune', 'Bavdhan, Pune']),
    llStatus: x.llStatus ?? 'not_applied',
    llNumber: x.llNumber ?? null,
    llTestDate: x.llTestDays ? ts(istAt(addYmd(today, x.llTestDays), '11:00')) : null,
    dlStatus: x.dlStatus ?? 'not_applied',
    dlNumber: x.dlNumber ?? null,
    dlTestDate: x.dlTestDays ? ts(istAt(addYmd(today, x.dlTestDays), '10:00')) : null,
  });
  st.status = x.dropped ? 'dropped' : done ? 'completed' : 'active';
}
log(`${lessons} past lessons with notes, skills and ratings`);

// ---------- upcoming bookings (real bookSlot) ----------
const openSlots = (await adb.collection(S('slots')).where('status', '==', 'open').orderBy('start').get()).docs
  .map((d) => d.data())
  .filter((s) => s.start.toMillis() > now + 3 * 3600e3);
let booked = 0;
for (const st of students.filter((s) => s.status === 'active' && s.completed > 0)) {
  const mine = openSlots.filter((s) => s.instructorId === st.instructor.uid && !s.taken);
  for (const slot of [mine[booked % 3], mine[(booked % 3) + 9]].filter(Boolean)) {
    if (slot.taken) continue;
    try {
      await owner.call('bookSlot', { schoolId, slotId: slot.id, studentId: st.id });
      slot.taken = true;
      booked++;
    } catch (err) {
      if (!String(err.code).endsWith('failed-precondition')) throw err; // per-day limit etc.
    }
  }
}
log(`${booked} upcoming lessons booked`);

// ---------- payments (real recordManualPayment → receipt no + PDF) ----------
const pays = [];
for (const st of students) {
  const fee = st.extra.feeTotal ?? st.course.price;
  const plan =
    st.status === 'completed' ? [fee / 2, fee / 2]
      : st.completed >= 6 ? [Math.round(fee * 0.5), 100000]
        : st.completed >= 1 ? [Math.round(fee * 0.4)]
          : [];
  for (const amount of plan) pays.push({ st, amount: Math.round(amount / 100) * 100 });
}
pays.sort(() => rand() - 0.5);
let paidCount = 0;
for (const [i, p] of pays.entries()) {
  const method = i % 3 === 0 ? 'upi' : 'cash';
  const out = await owner.call('recordManualPayment', {
    schoolId, studentId: p.st.id, amount: p.amount, method, note: method === 'upi' ? 'UPI to princedriving@okicici' : 'Cash at office',
  });
  // Spread the history over the last 30 days (receipt numbers stay in order).
  const paidAt = now - Math.round(((pays.length - i) / pays.length) * 30 * DAY);
  await adb.doc(`${S('payments')}/${out.paymentId}`).update({ paidAt: ts(paidAt), createdAt: ts(paidAt) });
  paidCount++;
}
log(`${paidCount} cash/UPI payments with PDF receipts`);

// ---------- done ----------
await Promise.all(apps.map((a) => deleteApp(a).catch(() => {})));
printLogins(schoolId, code, students);
process.exit(0);
