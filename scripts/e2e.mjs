// End-to-end test of the whole Steerly flow against the local Firebase emulators.
//   Terminal 1: npm run emulators
//   Terminal 2: npm run e2e
// Each actor (owner, instructor, students, anonymous visitor) uses its own client SDK app, so
// Firestore rules and callable auth are exercised for real. firebase-admin is used only to
// inspect results and for two test fixtures (moving a lesson into the past, a pending payment).
import { createHmac } from 'node:crypto';
import { initializeApp as initClient, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  addDoc, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore,
  limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb, Timestamp } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';

const PROJECT = 'demo-steerly';
const REGION = 'asia-south1';
const HOST = '127.0.0.1';
const WEBHOOK_SECRET = 'e2e-webhook-secret'; // must match functions/.secret.local
process.env.FIRESTORE_EMULATOR_HOST ??= `${HOST}:8080`;
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${HOST}:9099`;
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= `${HOST}:9199`;

const admin = initAdmin({ projectId: PROJECT, storageBucket: `${PROJECT}.appspot.com` });
const adb = getAdminDb(admin);
const aauth = getAdminAuth(admin);

// Unique phones per run so the script can be re-run without clearing the emulator.
const run = String(Date.now()).slice(-5);
const phone = (n) => `9${n}${run}`.padEnd(10, '0').slice(0, 10);
const PHONES = { owner: phone(1), instructor: phone(2), student: phone(3), student2: phone(4), joiner: phone(5), admin2: phone(6) };

// ---------- harness ----------
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✘ ${name}\n      ${err?.code ?? ''} ${err?.message ?? err}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}
async function expectFail(promise, code) {
  try {
    await promise;
  } catch (err) {
    if (code && !String(err.code).endsWith(code)) throw new Error(`Expected ${code}, got ${err.code}: ${err.message}`);
    return err;
  }
  throw new Error(`Expected failure${code ? ` (${code})` : ''} but it succeeded`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

// ---------- actors ----------
const apps = [];
function actor(name) {
  const app = initClient({ apiKey: 'demo-key', projectId: PROJECT, authDomain: `${PROJECT}.firebaseapp.com`, storageBucket: `${PROJECT}.appspot.com` }, `${name}-${run}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${HOST}:9099`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, HOST, 8080);
  const fns = getFunctions(app, REGION);
  connectFunctionsEmulator(fns, HOST, 5001);
  const call = async (fn, data) => (await httpsCallable(fns, fn)(data)).data;
  return {
    name, app, auth, db, call,
    async login(phone10) {
      const { devCode } = await call('requestOtp', { phone: phone10 });
      assert(/^\d{6}$/.test(devCode ?? ''), 'requestOtp returns devCode in dev mode');
      const { token } = await call('verifyOtp', { phone: phone10, code: devCode });
      await signInWithCustomToken(auth, token);
      return this.claims();
    },
    async claims() {
      return (await auth.currentUser.getIdTokenResult(true)).claims;
    },
  };
}

const owner = actor('owner');
const instructor = actor('instructor');
const student = actor('student');
const student2 = actor('student2');
const joiner = actor('joiner');
const visitor = actor('visitor');
const superA = actor('super');

const ctx = {};
const S = (sub) => `schools/${ctx.schoolId}/${sub}`;

console.log(`\nSteerly E2E (run ${run}) against ${HOST} emulators\n`);

// ---------- 1. Owner onboarding ----------
console.log('Onboarding');
await step('owner logs in with phone OTP (new user, no role)', async () => {
  const c = await owner.login(PHONES.owner);
  assert(!c.role, 'new owner has no role yet');
});
await step('wrong OTP is rejected', async () => {
  await owner.call('requestOtp', { phone: PHONES.admin2 });
  await expectFail(owner.call('verifyOtp', { phone: PHONES.admin2, code: '000000' }), 'invalid-argument');
});
await step('owner creates a school (trial, slug, code, seeded courses)', async () => {
  const out = await owner.call('createSchool', {
    name: `E2E Driving School ${run}`, city: 'Pune', phone: PHONES.owner, address: 'FC Road', ownerName: 'Olivia Owner',
  });
  ctx.schoolId = out.schoolId;
  ctx.code = out.code;
  const c = await owner.claims();
  assert(c.role === 'owner' && c.schoolId === ctx.schoolId, 'owner claims set');
  const school = (await adb.doc(`schools/${ctx.schoolId}`).get()).data();
  assert(school.subscription.status === 'trial', 'trial status');
  ctx.slug = school.slug;
  assert(/^[a-z0-9-]+$/.test(school.slug), 'slug is lowercase');
  assert((await adb.doc(`schoolSlugs/${school.slug}`).get()).exists, 'schoolSlugs written');
  assert((await adb.doc(`schoolCodes/${ctx.code}`).get()).exists, 'schoolCodes written');
});
await step('owner cannot create a second school', async () => {
  await expectFail(owner.call('createSchool', { name: 'Dup School', city: 'Pune', phone: PHONES.owner, ownerName: 'O' }));
});
await step('anyone can read school profile + courses (public); 3 courses seeded', async () => {
  assert((await getDoc(doc(visitor.db, `schools/${ctx.schoolId}`))).exists(), 'public school get');
  const cs = await getDocs(collection(visitor.db, S('courses')));
  assert(cs.size === 3, `3 seeded courses, got ${cs.size}`);
  ctx.course = cs.docs.map((d) => d.data()).find((c) => c.vehicleType === 'car_manual') ?? cs.docs[0].data();
});
await step('owner can edit school settings but not subscription', async () => {
  await updateDoc(doc(owner.db, `schools/${ctx.schoolId}`), { 'settings.maxBookingsPerDay': 1, brandColor: '#7C3AED' });
  await expectFail(updateDoc(doc(owner.db, `schools/${ctx.schoolId}`), { 'subscription.status': 'active' }), 'permission-denied');
});

// ---------- 2. Team ----------
console.log('Team');
await step('owner invites an instructor by phone', async () => {
  await owner.call('inviteMember', { schoolId: ctx.schoolId, phone: PHONES.instructor, name: 'Ishaan Instructor', role: 'instructor' });
  assert((await adb.doc(`${S('invites')}/+91${PHONES.instructor}`).get()).exists, 'invite doc');
});
await step('instructor logs in and is auto-linked from the invite', async () => {
  const c = await instructor.login(PHONES.instructor);
  assert(c.role === 'instructor' && c.schoolId === ctx.schoolId, `instructor claims, got ${JSON.stringify(c)}`);
  ctx.instructorUid = instructor.auth.currentUser.uid;
  assert((await adb.doc(`${S('members')}/${ctx.instructorUid}`).get()).exists, 'member doc');
  assert(!(await adb.doc(`${S('invites')}/+91${PHONES.instructor}`).get()).exists, 'invite consumed');
});
await step('instructor cannot edit courses (admin only)', async () => {
  await expectFail(addDoc(collection(instructor.db, S('courses')), { name: 'Hack', price: 1 }), 'permission-denied');
});

// ---------- 3. Schedule ----------
console.log('Schedule');
await step('owner sets weekly availability and generates 7 days of slots', async () => {
  const day = [{ start: '07:00', end: '11:00' }];
  const weekly = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
  await setDoc(doc(owner.db, `${S('availability')}/${ctx.instructorUid}`), {
    instructorId: ctx.instructorUid, weekly, vehicleId: null, updatedAt: serverTimestamp(),
  });
  const ymd = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const from = new Date(Date.now() + 86400e3);
  const to = new Date(Date.now() + 7 * 86400e3);
  const out = await owner.call('generateSlots', { schoolId: ctx.schoolId, instructorId: ctx.instructorUid, from: ymd(from), to: ymd(to) });
  assert(out.created === 7 * 4, `28 slots (7 days × 4 one-hour slots), got ${out.created}`);
  const again = await owner.call('generateSlots', { schoolId: ctx.schoolId, instructorId: ctx.instructorUid, from: ymd(from), to: ymd(to) });
  assert(again.created === 0, 'regenerating is idempotent');
});

// ---------- 4. Lead → student ----------
console.log('Leads & students');
const enquiry = (over = {}) => ({
  name: 'Sara Student', phone: PHONES.student, courseId: ctx.course.id, courseName: ctx.course.name,
  preferredTime: 'Morning', source: 'web', status: 'New', notes: '', followUpAt: null, studentId: null,
  updatedAt: null, createdAt: serverTimestamp(), ...over,
});
await step('anonymous visitor submits an enquiry (public form)', async () => {
  const ref = await addDoc(collection(visitor.db, S('enquiries')), enquiry());
  ctx.enquiryId = ref.id;
});
await step('invalid enquiries are rejected by rules', async () => {
  await expectFail(addDoc(collection(visitor.db, S('enquiries')), enquiry({ status: 'Enrolled' })), 'permission-denied');
  await expectFail(addDoc(collection(visitor.db, S('enquiries')), enquiry({ phone: '12345' })), 'permission-denied');
  await expectFail(addDoc(collection(visitor.db, S('enquiries')), enquiry({ hacked: true })), 'permission-denied');
});
await step('visitor cannot read enquiries; owner can', async () => {
  await expectFail(getDocs(collection(visitor.db, S('enquiries'))), 'permission-denied');
  const qs = await getDocs(collection(owner.db, S('enquiries')));
  assert(qs.size >= 1, 'owner sees enquiries');
});
await step('owner gets an in-app notification for the new enquiry (trigger)', async () => {
  const ownerUid = owner.auth.currentUser.uid;
  await waitFor(async () => !(await adb.collection(`users/${ownerUid}/notifications`).where('type', '==', 'enquiry').get()).empty, 'enquiry notification');
});
await step('owner logs a walk-in lead directly', async () => {
  await addDoc(collection(owner.db, S('enquiries')), enquiry({ name: 'Walk In', phone: phone(7), source: 'walk_in', notes: 'came by', status: 'Contacted' }));
});
await step('owner converts the enquiry to a student (fee from course)', async () => {
  const { studentId } = await owner.call('convertEnquiry', { schoolId: ctx.schoolId, enquiryId: ctx.enquiryId, courseId: ctx.course.id, instructorId: ctx.instructorUid });
  ctx.studentId = studentId;
  const s = (await adb.doc(`${S('students')}/${studentId}`).get()).data();
  assert(s.feeTotal === ctx.course.price && s.sessionsTotal === ctx.course.sessions, 'fee + sessions from course');
  assert(s.dlNumber === null, 'dlNumber initialised');
  const e = (await adb.doc(`${S('enquiries')}/${ctx.enquiryId}`).get()).data();
  assert(e.status === 'Enrolled' && e.studentId === studentId, 'enquiry marked enrolled');
});
await step('duplicate student by phone is refused', async () => {
  await expectFail(owner.call('createStudent', { schoolId: ctx.schoolId, courseId: ctx.course.id, name: 'Dup', phone: PHONES.student }), 'already-exists');
});
await step('owner adds a second student directly', async () => {
  const { studentId } = await owner.call('createStudent', { schoolId: ctx.schoolId, courseId: ctx.course.id, name: 'Sam Second', phone: PHONES.student2, feeTotal: 500000 });
  ctx.student2Id = studentId;
});

// ---------- 5. Student app ----------
console.log('Student');
await step('student logs in and is auto-linked to their record', async () => {
  const c = await student.login(PHONES.student);
  assert(c.role === 'student' && c.studentId === ctx.studentId, `student claims, got ${JSON.stringify(c)}`);
});
await step('student reads own record but not another student', async () => {
  assert((await getDoc(doc(student.db, `${S('students')}/${ctx.studentId}`))).exists(), 'own record');
  await expectFail(getDoc(doc(student.db, `${S('students')}/${ctx.student2Id}`)), 'permission-denied');
});
await step('student cannot change their own fee', async () => {
  await expectFail(updateDoc(doc(student.db, `${S('students')}/${ctx.studentId}`), { feePaid: 99999999 }), 'permission-denied');
  await updateDoc(doc(student.db, `${S('students')}/${ctx.studentId}`), { address: 'Baner, Pune' });
});
await step('student books an open slot', async () => {
  const qs = await getDocs(query(collection(student.db, S('slots')), where('status', '==', 'open'), orderBy('start'), limit(40)));
  const slots = qs.docs.map((d) => d.data());
  const istDay = (s) => new Date(s.start.toMillis() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const days = [...new Set(slots.map(istDay))];
  ctx.slotA = slots.find((s) => istDay(s) === days[0]);
  ctx.slotA2 = slots.filter((s) => istDay(s) === days[0])[1];
  ctx.slotB = slots.find((s) => istDay(s) === days[1]);
  const { bookingId } = await student.call('bookSlot', { schoolId: ctx.schoolId, slotId: ctx.slotA.id });
  ctx.bookingId = bookingId;
  const slot = (await adb.doc(`${S('slots')}/${ctx.slotA.id}`).get()).data();
  assert(slot.status === 'booked' && slot.bookingId === bookingId, 'slot marked booked');
});
await step('the same slot cannot be booked twice', async () => {
  await student2.login(PHONES.student2);
  await expectFail(student2.call('bookSlot', { schoolId: ctx.schoolId, slotId: ctx.slotA.id }), 'failed-precondition');
});
await step('max bookings per day is enforced', async () => {
  await expectFail(student.call('bookSlot', { schoolId: ctx.schoolId, slotId: ctx.slotA2.id }), 'failed-precondition');
});
await step('student books another day then cancels it (slot reopens)', async () => {
  const { bookingId } = await student.call('bookSlot', { schoolId: ctx.schoolId, slotId: ctx.slotB.id });
  await student.call('cancelBooking', { schoolId: ctx.schoolId, bookingId, reason: 'exam' });
  const slot = (await adb.doc(`${S('slots')}/${ctx.slotB.id}`).get()).data();
  assert(slot.status === 'open', 'slot reopened');
});
await step('student sees only their own bookings', async () => {
  const mine = await getDocs(query(collection(student.db, S('bookings')), where('studentId', '==', ctx.studentId)));
  assert(mine.size === 2, `2 bookings (1 cancelled), got ${mine.size}`);
  await expectFail(getDocs(collection(student.db, S('bookings'))), 'permission-denied');
});

// ---------- 6. Instructor completes ----------
console.log('Instructor');
await step('instructor cannot complete a lesson before it starts', async () => {
  await expectFail(instructor.call('completeBooking', { schoolId: ctx.schoolId, bookingId: ctx.bookingId, attendance: 'present' }), 'failed-precondition');
});
await step('instructor completes the lesson (skills + progress)', async () => {
  // Fixture: move the lesson into the past.
  const past = Timestamp.fromMillis(Date.now() - 3600e3);
  await adb.doc(`${S('bookings')}/${ctx.bookingId}`).update({ start: past, end: Timestamp.fromMillis(Date.now() - 60e3) });
  await instructor.call('completeBooking', {
    schoolId: ctx.schoolId, bookingId: ctx.bookingId, attendance: 'present',
    skillsCovered: ['steering', 'clutch'], skillLevels: { steering: 2, clutch: 1 }, notes: 'Good start',
  });
  const s = (await adb.doc(`${S('students')}/${ctx.studentId}`).get()).data();
  assert(s.sessionsCompleted === 1 && s.skills.steering === 2, 'student progress updated');
});
await step('student rates the lesson once', async () => {
  await student.call('rateBooking', { schoolId: ctx.schoolId, bookingId: ctx.bookingId, rating: 5, feedback: 'Great' });
  await expectFail(student.call('rateBooking', { schoolId: ctx.schoolId, bookingId: ctx.bookingId, rating: 1 }));
});
await step('instructor can read their bookings and students', async () => {
  const b = await getDocs(query(collection(instructor.db, S('bookings')), where('instructorId', '==', ctx.instructorUid)));
  assert(b.size >= 1, 'instructor bookings');
  const s = await getDocs(query(collection(instructor.db, S('students')), where('instructorId', '==', ctx.instructorUid)));
  assert(s.size >= 1, 'assigned students');
});

// ---------- 7. Payments ----------
console.log('Payments');
await step('owner records a cash payment → receipt no + PDF + feePaid', async () => {
  const out = await owner.call('recordManualPayment', { schoolId: ctx.schoolId, studentId: ctx.studentId, amount: 100000, method: 'cash', note: 'first instalment' });
  assert(/^[A-Z]+-\d{4}-\d{5}$/.test(out.receiptNo), `receipt format, got ${out.receiptNo}`);
  ctx.cashPaymentId = out.paymentId;
  const s = (await adb.doc(`${S('students')}/${ctx.studentId}`).get()).data();
  assert(s.feePaid === 100000, 'feePaid updated');
  const p = (await adb.doc(`${S('payments')}/${out.paymentId}`).get()).data();
  assert(p.receiptPath, 'receipt PDF path stored');
  const [exists] = await getAdminStorage(admin).bucket().file(p.receiptPath).exists();
  assert(exists, 'receipt PDF in storage');
});
await step('receipt numbers increase', async () => {
  const out = await owner.call('recordManualPayment', { schoolId: ctx.schoolId, studentId: ctx.studentId, amount: 50000, method: 'upi' });
  const n = Number(out.receiptNo.split('-').pop());
  assert(n === 2, `second receipt is #2, got ${out.receiptNo}`);
});
await step('cannot overpay beyond the outstanding fee', async () => {
  await expectFail(owner.call('recordManualPayment', { schoolId: ctx.schoolId, studentId: ctx.studentId, amount: 99999900, method: 'cash' }));
});
await step('student can open their receipt (download URL serves the PDF)', async () => {
  const { url } = await student.call('getReceiptUrl', { schoolId: ctx.schoolId, paymentId: ctx.cashPaymentId });
  const res = await fetch(url);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert(res.ok && bytes.subarray(0, 4).toString() === '%PDF', `PDF downloaded (status ${res.status})`);
});
await step('student cannot open another student\'s receipt', async () => {
  const out = await owner.call('recordManualPayment', { schoolId: ctx.schoolId, studentId: ctx.student2Id, amount: 10000, method: 'cash' });
  await expectFail(student.call('getReceiptUrl', { schoolId: ctx.schoolId, paymentId: out.paymentId }), 'permission-denied');
});
await step('Razorpay link fails cleanly without real keys (payment marked failed)', async () => {
  await expectFail(student.call('createPaymentLink', { schoolId: ctx.schoolId, amount: 10000 }), 'unavailable');
});
await step('Razorpay webhook: bad signature rejected', async () => {
  const res = await fetch(`http://${HOST}:5001/${PROJECT}/${REGION}/razorpayWebhook`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'nope' }, body: '{}',
  });
  assert(res.status === 400, `400, got ${res.status}`);
});
await step('Razorpay webhook: payment_link.paid marks paid once (idempotent)', async () => {
  // Fixture: a pending online payment as createPaymentLink would have created it.
  const ref = adb.collection(S('payments')).doc();
  await ref.set({
    id: ref.id, studentId: ctx.studentId, studentName: 'Sara Student', amount: 20000, method: 'razorpay', status: 'created',
    note: '', receiptNo: null, receiptPath: null, razorpayPaymentLinkId: 'plink_e2e', razorpayPaymentLinkUrl: 'https://rzp.io/e2e',
    razorpayPaymentId: null, recordedBy: null, createdAt: Timestamp.now(), paidAt: null,
  });
  const before = (await adb.doc(`${S('students')}/${ctx.studentId}`).get()).data().feePaid;
  const body = JSON.stringify({
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { id: 'plink_e2e', reference_id: ref.id, notes: { schoolId: ctx.schoolId, studentId: ctx.studentId, paymentId: ref.id } } },
      payment: { entity: { id: 'pay_e2e', amount: 20000 } },
    },
  });
  const sig = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`http://${HOST}:5001/${PROJECT}/${REGION}/razorpayWebhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, body,
    });
    assert(res.status === 200, `webhook 200, got ${res.status} ${await res.text()}`);
  }
  const p = (await ref.get()).data();
  assert(p.status === 'paid' && p.receiptNo && p.razorpayPaymentId === 'pay_e2e', 'payment paid with receipt');
  const after = (await adb.doc(`${S('students')}/${ctx.studentId}`).get()).data().feePaid;
  assert(after - before === 20000, `feePaid +20000 exactly once, got +${after - before}`);
});
await step('student sees only their own payments', async () => {
  const mine = await getDocs(query(collection(student.db, S('payments')), where('studentId', '==', ctx.studentId)));
  assert(mine.size >= 3, 'own payments visible');
  await expectFail(getDocs(collection(student.db, S('payments'))), 'permission-denied');
});

// ---------- 8. Reports ----------
console.log('Reports');
await step('dashboard stats reflect the activity', async () => {
  const from = new Date(Date.now() - 86400e3).toISOString();
  const to = new Date(Date.now() + 86400e3).toISOString();
  const st = await owner.call('getDashboardStats', { schoolId: ctx.schoolId, from, to });
  assert(st.revenue >= 170000, `revenue ≥ ₹1,700, got ${st.revenue}`);
  assert(st.activeStudents >= 2, `active students ≥ 2, got ${st.activeStudents}`);
  assert(st.lessonsCompleted >= 1, `lessons completed ≥ 1, got ${st.lessonsCompleted}`);
  assert(st.newEnquiries >= 2, `new enquiries ≥ 2, got ${st.newEnquiries}`);
});
await step('students cannot read dashboard stats', async () => {
  await expectFail(student.call('getDashboardStats', { schoolId: ctx.schoolId, from: new Date().toISOString(), to: new Date().toISOString() }), 'permission-denied');
});

// ---------- 9. Join by code, notifications, account deletion ----------
console.log('Accounts');
await step('a new user joins the school with its code', async () => {
  await joiner.login(PHONES.joiner);
  const out = await joiner.call('joinSchool', { code: ctx.code.toLowerCase(), name: 'Jay Joiner' });
  await joiner.auth.currentUser.getIdToken(true);
  const c = await joiner.claims();
  assert(c.role === 'student' && c.studentId === out.studentId, 'joiner is a student');
});
await step('notification inbox: student can read + mark read, not create', async () => {
  const uid = student.auth.currentUser.uid;
  const qs = await getDocs(collection(student.db, `users/${uid}/notifications`));
  assert(qs.size >= 1, `student has notifications (got ${qs.size})`);
  await updateDoc(qs.docs[0].ref, { read: true });
  await expectFail(addDoc(collection(student.db, `users/${uid}/notifications`), { title: 'x' }), 'permission-denied');
});
await step('student saves push token on own user doc only', async () => {
  const uid = student.auth.currentUser.uid;
  await updateDoc(doc(student.db, `users/${uid}`), { expoPushToken: 'ExponentPushToken[e2e]' });
  await expectFail(updateDoc(doc(student.db, `users/${uid}`), { role: 'owner' }), 'permission-denied');
});
await step('owner cannot delete their account (must transfer ownership)', async () => {
  await expectFail(owner.call('deleteMyAccount', { confirm: 'DELETE' }), 'failed-precondition');
});
await step('student deletes their account; school keeps the record', async () => {
  const uid = joiner.auth.currentUser.uid;
  const sid = (await joiner.claims()).studentId;
  await joiner.call('deleteMyAccount', { confirm: 'DELETE' });
  await expectFail(aauth.getUser(uid));
  assert(!(await adb.doc(`users/${uid}`).get()).exists, 'user doc deleted');
  const s = (await adb.doc(`${S('students')}/${sid}`).get()).data();
  assert(s && s.uid === null, 'student record kept and unlinked');
});

// ---------- 10. Platform / super admin ----------
console.log('Platform');
await step('super admin suspends the school; public enquiries + booking stop', async () => {
  await superA.login(PHONES.admin2);
  await aauth.setCustomUserClaims(superA.auth.currentUser.uid, { role: 'superAdmin' });
  await superA.auth.currentUser.getIdToken(true);
  const list = await getDocs(collection(superA.db, 'schools'));
  assert(list.size >= 1, 'super admin lists schools');
  await expectFail(getDocs(collection(owner.db, 'schools')), 'permission-denied');
  await superA.call('setSchoolStatus', { schoolId: ctx.schoolId, status: 'suspended' });
  await expectFail(addDoc(collection(visitor.db, S('enquiries')), enquiry({ phone: phone(8) })), 'permission-denied');
  await expectFail(student.call('bookSlot', { schoolId: ctx.schoolId, slotId: ctx.slotB.id }), 'failed-precondition');
  await superA.call('setSchoolStatus', { schoolId: ctx.schoolId, status: 'active' });
});
await step('a school owner cannot use another school\'s data', async () => {
  const other = actor('other-owner');
  await other.login(phone(9));
  await other.call('createSchool', { name: `Other School ${run}`, city: 'Mumbai', phone: phone(9), ownerName: 'Other' });
  await other.auth.currentUser.getIdToken(true);
  await expectFail(getDocs(collection(other.db, S('students'))), 'permission-denied');
  await expectFail(other.call('createStudent', { schoolId: ctx.schoolId, courseId: ctx.course.id, name: 'Xavier', phone: phone(0) }), 'permission-denied');
});

// ---------- summary ----------
await Promise.all(apps.map((a) => deleteApp(a).catch(() => {})));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('Failed:');
  for (const f of failed) console.log(` - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
