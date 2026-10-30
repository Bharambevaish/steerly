import { securityEvent } from './lib/securityLog';
import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  createPaymentLinkSchema,
  formatINR,
  getReceiptUrlSchema,
  recordManualPaymentSchema,
  toE164,
  type CreatePaymentLinkOutput,
  type GetReceiptUrlOutput,
  type Payment,
  type PaymentRecordedOutput,
  type School,
  type SchoolStatus,
  type Student,
} from '@steerly/shared';
import { bucket, db } from './lib/admin';
import { getPayment, getSchool, getStudent, schoolRef, sub, subDoc } from './lib/data';
import { ADMIN, assertRole, callable, type Caller } from './lib/guard';
import { notify, notifySchoolAdmins } from './lib/notify';
import {
  AISENSY_API_KEY,
  PUBLIC_WEB_URL,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  WHATSAPP_CAMPAIGN_PAYMENT_LINK,
  WHATSAPP_CAMPAIGN_RECEIPT,
} from './lib/params';
import { sendWhatsApp } from './lib/whatsapp';
import { razorpay, razorpayErrorMessage } from './lib/razorpay';
import { allocateReceiptNo, saveReceiptPdf } from './lib/receipts';
import { verifyRazorpaySignature } from './lib/signature';

const isStudentCaller = (c: Caller) => c.role === 'student';

/** Student id the caller may act on: own claim for students, input for admins. */
function targetStudentId(caller: Caller, inputId: string | undefined): string {
  const id = isStudentCaller(caller) ? caller.claims.studentId : inputId;
  if (!id) throw new HttpsError('invalid-argument', 'Please choose a student.');
  return id;
}

function assertWithinOutstanding(student: Student, amount: number): void {
  const outstanding = student.feeTotal - student.feePaid;
  if (outstanding <= 0) throw new HttpsError('failed-precondition', 'There are no pending fees for this student.');
  if (amount > outstanding) throw new HttpsError('invalid-argument', `Amount is more than the balance due (${formatINR(outstanding)}).`);
}

function newPayment(id: string, student: Student, amount: number, method: Payment['method'], note: string, recordedBy: string | null): Payment {
  return {
    id,
    studentId: student.id,
    studentName: student.name,
    amount,
    method,
    status: 'created',
    note,
    receiptNo: null,
    receiptPath: null,
    razorpayPaymentLinkId: null,
    razorpayPaymentLinkUrl: null,
    razorpayPaymentId: null,
    recordedBy,
    createdAt: Timestamp.now(),
    paidAt: null,
  };
}

/**
 * Idempotently marks a payment paid: receipt number, student.feePaid, PDF, notifications.
 * Returns null when it was already paid.
 */
async function markPaid(schoolId: string, paymentId: string, razorpayPaymentId: string | null): Promise<Payment | null> {
  const paymentRef = subDoc(schoolId, 'payments', paymentId);
  const result = await db.runTransaction(async (tx) => {
    const payment = await getPayment(schoolId, paymentId, tx);
    if (payment.status === 'paid') return null;
    const school = await getSchool(schoolId, tx);
    const student = await getStudent(schoolId, payment.studentId, tx);
    const receiptNo = await allocateReceiptNo(tx, schoolId, school.settings.receiptPrefix);
    const paidAt = Timestamp.now();
    tx.update(paymentRef, { status: 'paid', receiptNo, paidAt, razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId });
    tx.update(subDoc(schoolId, 'students', payment.studentId), { feePaid: FieldValue.increment(payment.amount) });
    const paid: Payment = { ...payment, status: 'paid', receiptNo, paidAt, razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId };
    return { payment: paid, school, student: { ...student, feePaid: student.feePaid + payment.amount } };
  });
  if (!result) return null;
  const { payment, school, student } = result;

  try {
    const path = await saveReceiptPdf(schoolId, school, student, payment);
    await paymentRef.update({ receiptPath: path });
    payment.receiptPath = path;
  } catch (err) {
    // getReceiptUrl regenerates a missing PDF on demand.
    logger.error('Receipt PDF generation failed', { schoolId, paymentId, err });
  }

  const body = `${formatINR(payment.amount)} received. Receipt ${payment.receiptNo}.`;
  await notify(student.uid, { title: 'Payment received', body, type: 'payment', link: `/payments/${payment.id}` });
  await sendWhatsApp({
    phone10: student.phone,
    campaign: WHATSAPP_CAMPAIGN_RECEIPT.value(),
    userName: student.name,
    params: [
      student.name,
      formatINR(payment.amount),
      school.name,
      payment.receiptNo ?? '-',
      formatINR(Math.max(0, student.feeTotal - student.feePaid)),
    ],
  });
  await notifySchoolAdmins(schoolId, {
    title: 'Payment received',
    body: `${student.name} paid ${formatINR(payment.amount)} (${payment.method}).`,
    type: 'payment',
    link: `/students/${student.id}`,
  });
  return payment;
}

export const createPaymentLink = callable(
  createPaymentLinkSchema,
  async (data, request): Promise<CreatePaymentLinkOutput> => {
    const caller = assertRole(request, data.schoolId, [...ADMIN, 'student']);
    const studentId = targetStudentId(caller, data.studentId);
    const [school, student] = await Promise.all([getSchool(data.schoolId), getStudent(data.schoolId, studentId)]);
    if (school.subscription.status === 'suspended') throw new HttpsError('failed-precondition', 'Online payments are unavailable for this school.');
    assertWithinOutstanding(student, data.amount);

    const ref = sub(data.schoolId, 'payments').doc();
    await ref.create(newPayment(ref.id, student, data.amount, 'razorpay', '', isStudentCaller(caller) ? null : caller.uid));
    try {
      const link = await razorpay().paymentLink.create({
        amount: data.amount,
        currency: 'INR',
        reference_id: ref.id,
        description: `${school.name} – ${student.courseName}`.slice(0, 255),
        customer: { name: student.name, contact: toE164(student.phone), ...(student.email ? { email: student.email } : {}) },
        notify: { sms: true },
        notes: { schoolId: data.schoolId, studentId, paymentId: ref.id },
        callback_url: `${PUBLIC_WEB_URL.value().replace(/\/$/, '')}/paid`,
        callback_method: 'get',
      });
      await ref.update({ razorpayPaymentLinkId: link.id, razorpayPaymentLinkUrl: link.short_url });
      await sendWhatsApp({
        phone10: student.phone,
        campaign: WHATSAPP_CAMPAIGN_PAYMENT_LINK.value(),
        userName: student.name,
        params: [student.name, formatINR(data.amount), student.courseName, school.name, link.short_url],
      });
      return { paymentId: ref.id, url: link.short_url };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('Razorpay paymentLink.create failed', { message: razorpayErrorMessage(err) });
      await ref.update({ status: 'failed' });
      throw new HttpsError('unavailable', "We couldn't create the payment link. Please try again.");
    }
  },
  { secrets: [RAZORPAY_KEY_SECRET, AISENSY_API_KEY] },
);

export const recordManualPayment = callable(
  recordManualPaymentSchema,
  async (data, request): Promise<PaymentRecordedOutput> => {
    const caller = assertRole(request, data.schoolId, ADMIN);
    const student = await getStudent(data.schoolId, data.studentId);
    assertWithinOutstanding(student, data.amount);
    const ref = sub(data.schoolId, 'payments').doc();
    await ref.create(newPayment(ref.id, student, data.amount, data.method, data.note, caller.uid));
    const paid = await markPaid(data.schoolId, ref.id, null);
    if (!paid?.receiptNo) throw new HttpsError('internal', 'Payment could not be recorded.');
    return { paymentId: ref.id, receiptNo: paid.receiptNo };
  },
  { secrets: [AISENSY_API_KEY] },
);

export const getReceiptUrl = callable(getReceiptUrlSchema, async (data, request): Promise<GetReceiptUrlOutput> => {
  const caller = assertRole(request, data.schoolId, [...ADMIN, 'student']);
  const payment = await getPayment(data.schoolId, data.paymentId);
  if (isStudentCaller(caller) && payment.studentId !== caller.claims.studentId) {
    throw new HttpsError('permission-denied', 'This receipt is not yours.');
  }
  if (payment.status !== 'paid') throw new HttpsError('failed-precondition', 'A receipt is available once the payment is complete.');

  let path = payment.receiptPath;
  if (!path) {
    const [school, student] = await Promise.all([getSchool(data.schoolId), getStudent(data.schoolId, payment.studentId)]);
    path = await saveReceiptPdf(data.schoolId, school, student, payment);
    await subDoc(data.schoolId, 'payments', payment.id).update({ receiptPath: path });
  }
  return { url: await receiptDownloadUrl(path) };
});

/** 15-minute signed URL in production. The emulator has no credentials to sign with, so there
 * we fall back to a Firebase download-token URL served by the Storage emulator. */
async function receiptDownloadUrl(path: string): Promise<string> {
  const file = bucket().file(path);
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  if (process.env.FUNCTIONS_EMULATOR === 'true' && emulatorHost) {
    const [meta] = await file.getMetadata();
    let token = String(meta.metadata?.firebaseStorageDownloadTokens ?? '').split(',')[0];
    if (!token) {
      token = randomUUID();
      await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
    }
    return `http://${emulatorHost}/v0/b/${file.bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  }
  const [url] = await file.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 15 * 60_000 });
  return url;
}

// ---------- Webhook ----------

interface RazorpayEntity<T> {
  entity: T;
}
interface WebhookEvent {
  event: string;
  payload: {
    payment_link?: RazorpayEntity<{ id: string; reference_id?: string; notes?: Record<string, string> }>;
    payment?: RazorpayEntity<{ id: string; amount: number }>;
    subscription?: RazorpayEntity<{ id: string; status: string; current_end?: number | null; notes?: Record<string, string> }>;
  };
}

const SUBSCRIPTION_STATUS: Record<string, SchoolStatus> = {
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.resumed': 'active',
  'subscription.pending': 'past_due',
  'subscription.halted': 'past_due',
  'subscription.cancelled': 'past_due',
};

async function handlePaymentLinkPaid(evt: WebhookEvent): Promise<void> {
  const link = evt.payload.payment_link?.entity;
  const schoolId = link?.notes?.schoolId;
  const paymentId = link?.notes?.paymentId ?? link?.reference_id;
  if (!schoolId || !paymentId) {
    logger.warn('payment_link.paid without schoolId/paymentId notes', { linkId: link?.id });
    return;
  }
  try {
    await markPaid(schoolId, paymentId, evt.payload.payment?.entity.id ?? null);
  } catch (err) {
    // Unknown payment/student: acknowledge so Razorpay stops retrying, but keep a loud log.
    if (err instanceof HttpsError && err.code === 'not-found') {
      logger.error('payment_link.paid for unknown record', { schoolId, paymentId, message: err.message });
      return;
    }
    throw err;
  }
}

async function handleSubscription(evt: WebhookEvent, status: SchoolStatus): Promise<void> {
  const subn = evt.payload.subscription?.entity;
  const schoolId = subn?.notes?.schoolId;
  if (!subn || !schoolId) {
    logger.warn('subscription event without notes.schoolId', { event: evt.event });
    return;
  }
  const plan = subn.notes?.plan;
  const update: Record<string, unknown> = {
    'subscription.status': status,
    'subscription.razorpaySubscriptionId': subn.id,
  };
  if (subn.current_end) update['subscription.currentPeriodEnd'] = Timestamp.fromMillis(subn.current_end * 1000);
  if (status === 'active' && (plan === 'starter' || plan === 'pro' || plan === 'whitelabel')) update['subscription.plan'] = plan;
  const school = (await schoolRef(schoolId).get()).data() as School | undefined;
  if (!school) return;
  // Ignore stale events for a subscription the school has since replaced.
  const current = school.subscription.razorpaySubscriptionId;
  if (current && current !== subn.id && status !== 'active') return;
  await schoolRef(schoolId).update(update);
  if (status === 'past_due') {
    await notify(school.ownerUid, {
      title: 'Subscription payment issue',
      body: 'Your Steerly subscription payment did not go through. Please update your payment to avoid interruption.',
      type: 'general',
      link: '/settings/billing',
    });
  }
}

export const razorpayWebhook = onRequest({ secrets: [RAZORPAY_WEBHOOK_SECRET, AISENSY_API_KEY], cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const signature = req.get('x-razorpay-signature');
  if (!verifyRazorpaySignature(req.rawBody, signature, RAZORPAY_WEBHOOK_SECRET.value())) {
    securityEvent('webhook_bad_signature', { hasSignature: Boolean(signature) });
    res.status(400).send('Invalid signature');
    return;
  }
  let evt: WebhookEvent;
  try {
    evt = JSON.parse(req.rawBody.toString('utf8')) as WebhookEvent;
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }
  try {
    if (evt.event === 'payment_link.paid') await handlePaymentLinkPaid(evt);
    else if (evt.event in SUBSCRIPTION_STATUS) await handleSubscription(evt, SUBSCRIPTION_STATUS[evt.event]);
    res.status(200).send('ok');
  } catch (err) {
    logger.error('Razorpay webhook handling failed', { event: evt.event, err });
    res.status(500).send('error'); // Razorpay retries
  }
});
