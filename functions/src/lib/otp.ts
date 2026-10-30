import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30_000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const TEST_OTP = '123456';
const HOUR_MS = 60 * 60_000;

/** Stored at otpRequests/{e164}. Times are epoch millis. */
export interface OtpState {
  hash: string;
  salt: string;
  expiresAtMs: number;
  attempts: number;
  lastSentAtMs: number;
  windowStartMs: number;
  sendsInWindow: number;
}

export type OtpCheck = 'ok' | 'missing' | 'expired' | 'locked' | 'wrong';

export const generateOtp = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const generateSalt = (): string => randomBytes(16).toString('hex');

export function hashOtp(phone: string, code: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${phone}:${code}`).digest('hex');
}

/** 0 when a new code may be sent now, else milliseconds to wait. */
export function resendWaitMs(prev: OtpState | null, nowMs: number): number {
  if (!prev) return 0;
  const cooldown = prev.lastSentAtMs + OTP_RESEND_COOLDOWN_MS - nowMs;
  if (cooldown > 0) return cooldown;
  const windowOpen = prev.windowStartMs + HOUR_MS > nowMs;
  if (windowOpen && prev.sendsInWindow >= OTP_MAX_SENDS_PER_HOUR) return prev.windowStartMs + HOUR_MS - nowMs;
  return 0;
}

export function nextOtpState(prev: OtpState | null, phone: string, code: string, salt: string, nowMs: number): OtpState {
  const windowOpen = prev !== null && prev.windowStartMs + HOUR_MS > nowMs;
  return {
    hash: hashOtp(phone, code, salt),
    salt,
    expiresAtMs: nowMs + OTP_TTL_MS,
    attempts: 0,
    lastSentAtMs: nowMs,
    windowStartMs: windowOpen && prev ? prev.windowStartMs : nowMs,
    sendsInWindow: windowOpen && prev ? prev.sendsInWindow + 1 : 1,
  };
}

export function checkOtp(state: OtpState | null, phone: string, code: string, nowMs: number): OtpCheck {
  if (!state) return 'missing';
  if (state.attempts >= OTP_MAX_ATTEMPTS) return 'locked';
  if (nowMs > state.expiresAtMs) return 'expired';
  const a = Buffer.from(hashOtp(phone, code, state.salt), 'hex');
  const b = Buffer.from(state.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'wrong';
}

/** "9876543210, +91 91234 56789" → Set of 10-digit numbers. */
export function parseTestNumbers(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((s) => s.replace(/\D/g, '').slice(-10))
      .filter((s) => s.length === 10),
  );
}

/** Fixed one-hour window counter (used per client IP). */
export interface WindowCounter {
  windowStartMs: number;
  count: number;
}

/** Returns the counter after one more hit, or null when `max` hits already happened this hour. */
export function bumpHourlyCounter(prev: WindowCounter | null, max: number, nowMs: number): WindowCounter | null {
  if (!prev || prev.windowStartMs + HOUR_MS <= nowMs) return { windowStartMs: nowMs, count: 1 };
  if (prev.count >= max) return null;
  return { windowStartMs: prev.windowStartMs, count: prev.count + 1 };
}

/** Salted hash so raw client IPs are never stored. */
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}
