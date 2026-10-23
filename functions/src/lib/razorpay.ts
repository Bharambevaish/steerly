import Razorpay from 'razorpay';
import { HttpsError } from 'firebase-functions/v2/https';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from './params';

let client: Razorpay | null = null;

/** Lazily built so params/secrets are only read at runtime. Functions using it must bind RAZORPAY_KEY_SECRET. */
export function razorpay(): Razorpay {
  if (client) return client;
  const key_id = RAZORPAY_KEY_ID.value();
  const key_secret = RAZORPAY_KEY_SECRET.value();
  if (!key_id || !key_secret) throw new HttpsError('failed-precondition', 'Online payments are not configured yet.');
  client = new Razorpay({ key_id, key_secret });
  return client;
}

/** Razorpay SDK errors are plain objects: { statusCode, error: { description } }. */
export function razorpayErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'error' in err) {
    const inner = (err as { error?: { description?: unknown } }).error;
    if (inner && typeof inner.description === 'string') return inner.description;
  }
  return err instanceof Error ? err.message : String(err);
}
