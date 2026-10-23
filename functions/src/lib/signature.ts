import { createHmac, timingSafeEqual } from 'node:crypto';

/** Razorpay webhook: X-Razorpay-Signature = hex HMAC-SHA256(rawBody, webhookSecret). */
export function verifyRazorpaySignature(rawBody: Buffer | string, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
