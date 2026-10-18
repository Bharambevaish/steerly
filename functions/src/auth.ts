import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  fromE164,
  requestOtpSchema,
  toE164,
  verifyOtpSchema,
  type Invite,
  type Member,
  type RequestOtpOutput,
  type Student,
  type UserDoc,
  type VerifyOtpOutput,
} from '@steerly/shared';
import { auth, db } from './lib/admin';
import { setClaims } from './lib/claims';
import { as, schoolIdOf, subDoc, userRef } from './lib/data';
import { callable } from './lib/guard';
import {
  checkOtp,
  generateOtp,
  generateSalt,
  nextOtpState,
  OTP_MAX_ATTEMPTS,
  parseTestNumbers,
  resendWaitMs,
  TEST_OTP,
  type OtpState,
} from './lib/otp';
import { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, OTP_DEV_MODE, OTP_TEST_NUMBERS } from './lib/params';

const otpRef = (e164: string) => db.collection('otpRequests').doc(e164);
const isDevMode = () => OTP_DEV_MODE.value() === 'true';
const isTestNumber = (phone10: string) => parseTestNumbers(OTP_TEST_NUMBERS.value()).has(phone10);

async function sendSms(e164: string, code: string): Promise<void> {
  const authKey = MSG91_AUTH_KEY.value();
  const templateId = MSG91_TEMPLATE_ID.value();
  if (!authKey || !templateId) {
    logger.error('MSG91 is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID)');
    throw new HttpsError('unavailable', "We couldn't send the OTP right now. Please try again later.");
  }
  // MSG91 Flow API. The DLT template must use the variable ##otp##.
  const res = await fetch('https://control.msg91.com/api/v5/flow', {
    method: 'POST',
    headers: { authkey: authKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ template_id: templateId, short_url: '0', recipients: [{ mobiles: e164.slice(1), otp: code }] }),
  });
  const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!res.ok || body.type === 'error') {
    logger.error('MSG91 send failed', { status: res.status, message: body.message });
    throw new HttpsError('unavailable', "We couldn't send the OTP right now. Please try again in a minute.");
  }
}

export const requestOtp = callable(
  requestOtpSchema,
  async ({ phone }): Promise<RequestOtpOutput> => {
    const devMode = isDevMode();
    if (isTestNumber(phone)) return devMode ? { sent: true, devCode: TEST_OTP } : { sent: true };

    const e164 = toE164(phone);
    const code = generateOtp();
    const now = Date.now();
    await db.runTransaction(async (tx) => {
      const prev = as<OtpState>(await tx.get(otpRef(e164)));
      const wait = resendWaitMs(prev, now);
      if (wait > 0) {
        const secs = Math.ceil(wait / 1000);
        const human = secs > 90 ? `${Math.ceil(secs / 60)} minutes` : `${secs} seconds`;
        throw new HttpsError('resource-exhausted', `Please wait ${human} before requesting another OTP.`);
      }
      const state = nextOtpState(prev, e164, code, generateSalt(), now);
      // `ttl` lets a Firestore TTL policy clean these up.
      tx.set(otpRef(e164), { ...state, ttl: Timestamp.fromMillis(now + 24 * 3600_000) });
    });

    if (devMode) return { sent: true, devCode: code };
    await sendSms(e164, code);
    return { sent: true };
  },
  { secrets: [MSG91_AUTH_KEY] },
);

async function consumeOtp(e164: string, code: string): Promise<void> {
  const result = await db.runTransaction(async (tx) => {
    const ref = otpRef(e164);
    const state = as<OtpState>(await tx.get(ref));
    const check = checkOtp(state, e164, code, Date.now());
    if (check === 'ok') tx.delete(ref);
    else if (check === 'wrong' && state) tx.update(ref, { attempts: state.attempts + 1 });
    return { check, attemptsLeft: state ? OTP_MAX_ATTEMPTS - state.attempts - 1 : 0 };
  });
  switch (result.check) {
    case 'ok':
      return;
    case 'missing':
      throw new HttpsError('failed-precondition', 'Please request an OTP first.');
    case 'expired':
      throw new HttpsError('deadline-exceeded', 'This OTP has expired. Please request a new one.');
    case 'locked':
      throw new HttpsError('resource-exhausted', 'Too many wrong attempts. Please request a new OTP.');
    case 'wrong':
      throw new HttpsError(
        'invalid-argument',
        result.attemptsLeft > 0 ? `Incorrect OTP. ${result.attemptsLeft} attempt(s) left.` : 'Incorrect OTP. Please request a new one.',
      );
  }
}

/** Finds or creates the Auth user for a phone number. */
async function ensureAuthUser(e164: string): Promise<{ uid: string; created: boolean }> {
  try {
    const user = await auth.getUserByPhoneNumber(e164);
    return { uid: user.uid, created: false };
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const user = await auth.createUser({ phoneNumber: e164 });
    return { uid: user.uid, created: true };
  }
}

async function ensureUserDoc(uid: string, e164: string): Promise<UserDoc> {
  const ref = userRef(uid);
  const existing = as<UserDoc>(await ref.get());
  if (existing) {
    if (!existing.phone) await ref.update({ phone: e164 });
    return { ...existing, phone: existing.phone ?? e164 };
  }
  const doc: UserDoc = {
    uid,
    name: '',
    phone: e164,
    email: null,
    role: null,
    schoolId: null,
    studentId: null,
    expoPushToken: null,
    createdAt: Timestamp.now(),
  };
  await ref.set(doc);
  return doc;
}

/** Accepts a pending staff/instructor invite for this phone. */
async function linkInvite(uid: string, e164: string, user: UserDoc): Promise<boolean> {
  const snap = await db.collectionGroup('invites').where('phone', '==', e164).limit(1).get();
  if (snap.empty) return false;
  const inviteSnap = snap.docs[0];
  const invite = inviteSnap.data() as Invite;
  const schoolId = schoolIdOf(inviteSnap.ref);
  const member: Member = {
    uid,
    name: invite.name,
    phone: e164,
    email: user.email,
    role: invite.role,
    active: true,
    createdAt: Timestamp.now(),
  };
  const batch = db.batch();
  batch.set(subDoc(schoolId, 'members', uid), member);
  batch.delete(inviteSnap.ref);
  if (!user.name) batch.update(userRef(uid), { name: invite.name });
  await batch.commit();
  await setClaims(uid, { role: invite.role, schoolId });
  return true;
}

/** Links an existing student record (created by the school) with this phone. */
async function linkStudent(uid: string, e164: string, user: UserDoc): Promise<boolean> {
  const snap = await db.collectionGroup('students').where('phone', '==', fromE164(e164)).where('uid', '==', null).get();
  if (snap.empty) return false;
  const latest = snap.docs
    .map((d) => ({ ref: d.ref, data: d.data() as Student }))
    .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis())[0];
  const schoolId = schoolIdOf(latest.ref);
  const batch = db.batch();
  batch.update(latest.ref, { uid });
  if (!user.name) batch.update(userRef(uid), { name: latest.data.name });
  await batch.commit();
  await setClaims(uid, { role: 'student', schoolId, studentId: latest.data.id });
  return true;
}

export const verifyOtp = callable(verifyOtpSchema, async ({ phone, code }): Promise<VerifyOtpOutput> => {
  const e164 = toE164(phone);
  if (isTestNumber(phone)) {
    if (code !== TEST_OTP) throw new HttpsError('invalid-argument', 'Incorrect OTP.');
  } else {
    await consumeOtp(e164, code);
  }

  const { uid, created } = await ensureAuthUser(e164);
  const user = await ensureUserDoc(uid, e164);
  const record = await auth.getUser(uid);
  const hasRole = typeof record.customClaims?.role === 'string';
  if (!hasRole) {
    try {
      (await linkInvite(uid, e164, user)) || (await linkStudent(uid, e164, user));
    } catch (err) {
      // Linking is best effort; the user can still join with a school code.
      logger.error('verifyOtp: auto-link failed', err);
    }
  }
  const token = await auth.createCustomToken(uid);
  return { token, isNewUser: created };
});
