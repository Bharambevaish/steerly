import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, generateCode, receiptPrefixFromName, slugCandidates, slugify } from '../src/lib/codes';
import {
  checkOtp,
  generateOtp,
  hashOtp,
  nextOtpState,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_TTL_MS,
  parseTestNumbers,
  resendWaitMs,
} from '../src/lib/otp';

const PHONE = '+919876543210';

describe('OTP', () => {
  const t0 = 1_800_000_000_000;

  it('generates 6-digit codes', () => {
    for (let i = 0; i < 50; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('hashes with salt and phone (no plain code stored)', () => {
    const a = hashOtp(PHONE, '123456', 'salt1');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(hashOtp(PHONE, '123456', 'salt2'));
    expect(a).not.toBe(hashOtp('+919999999999', '123456', 'salt1'));
  });

  it('accepts the right code before expiry only', () => {
    const s = nextOtpState(null, PHONE, '424242', 'abcd', t0);
    expect(checkOtp(s, PHONE, '424242', t0 + 1000)).toBe('ok');
    expect(checkOtp(s, PHONE, '000000', t0 + 1000)).toBe('wrong');
    expect(checkOtp(s, PHONE, '424242', t0 + OTP_TTL_MS + 1)).toBe('expired');
    expect(checkOtp(null, PHONE, '424242', t0)).toBe('missing');
  });

  it('locks after max attempts even with the right code', () => {
    const s = { ...nextOtpState(null, PHONE, '424242', 'abcd', t0), attempts: OTP_MAX_ATTEMPTS };
    expect(checkOtp(s, PHONE, '424242', t0 + 1000)).toBe('locked');
  });

  it('enforces a 30s resend cooldown and an hourly cap', () => {
    let s = nextOtpState(null, PHONE, '111111', 'a', t0);
    expect(resendWaitMs(null, t0)).toBe(0);
    expect(resendWaitMs(s, t0 + 10_000)).toBe(20_000);
    expect(resendWaitMs(s, t0 + 30_000)).toBe(0);
    for (let i = 1; i < OTP_MAX_SENDS_PER_HOUR; i++) s = nextOtpState(s, PHONE, '111111', 'a', t0 + i * 60_000);
    expect(s.sendsInWindow).toBe(OTP_MAX_SENDS_PER_HOUR);
    expect(s.attempts).toBe(0);
    expect(resendWaitMs(s, t0 + 10 * 60_000)).toBe(50 * 60_000);
    expect(resendWaitMs(s, t0 + 61 * 60_000)).toBe(0);
    expect(nextOtpState(s, PHONE, '1', 'a', t0 + 61 * 60_000).sendsInWindow).toBe(1);
  });

  it('parses test numbers', () => {
    expect([...parseTestNumbers(' 9876543210, +91 91234 56789,, 123')]).toEqual(['9876543210', '9123456789']);
  });
});

describe('codes and slugs', () => {
  it('generates 6-char codes from the unambiguous alphabet', () => {
    expect(CODE_ALPHABET).not.toMatch(/[IO01]/);
    for (let i = 0; i < 100; i++) expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(generateCode(4, () => 0)).toBe('AAAA');
  });

  it('slugifies names', () => {
    expect(slugify('Prince Driving School')).toBe('prince-driving-school');
    expect(slugify('  Sai & Sons Motor Tr@ining!! ')).toBe('sai-and-sons-motor-tr-ining');
    expect(slugify('Café Drive')).toBe('cafe-drive');
    expect(slugify('***')).toBe('school');
    expect(slugify('a'.repeat(80)).length).toBeLessThanOrEqual(48);
  });

  it('offers city and random fallbacks', () => {
    const list = slugCandidates('Prince Driving School', 'Pune', () => 0);
    expect(list.slice(0, 3)).toEqual(['prince-driving-school', 'prince-driving-school-pune', 'prince-driving-school-aaaa']);
  });

  it('derives receipt prefixes from initials', () => {
    expect(receiptPrefixFromName('Prince Driving School')).toBe('PDS');
    expect(receiptPrefixFromName('Shree Ganesh Motor Driving School')).toBe('SGMD');
    expect(receiptPrefixFromName('Maruti')).toBe('MAR');
    expect(receiptPrefixFromName('99')).toBe('STR');
  });
});
