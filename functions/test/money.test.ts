import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { formatRs, gstBreakup } from '../src/lib/gst';
import { formatReceiptNo, nextCounter } from '../src/lib/receiptNo';
import { verifyRazorpaySignature } from '../src/lib/signature';

describe('receipt numbers', () => {
  it('formats as PREFIX-YYYY-00001', () => {
    expect(formatReceiptNo('PDS', 2026, 42)).toBe('PDS-2026-00042');
    expect(formatReceiptNo('STR', 2027, 123456)).toBe('STR-2027-123456');
  });
  it('increments within a year and restarts in a new year', () => {
    expect(nextCounter(undefined, 2026)).toEqual({ year: 2026, seq: 1 });
    expect(nextCounter({ year: 2026, seq: 9 }, 2026)).toEqual({ year: 2026, seq: 10 });
    expect(nextCounter({ year: 2026, seq: 9 }, 2027)).toEqual({ year: 2027, seq: 1 });
  });
});

describe('gstBreakup (amounts are GST inclusive)', () => {
  it('is a no-op at 0%', () => {
    expect(gstBreakup(550000, 0)).toEqual({ total: 550000, taxable: 550000, gst: 0, cgst: 0, sgst: 0 });
  });
  it('splits 18% into taxable + CGST + SGST that add up exactly', () => {
    const g = gstBreakup(590000, 18);
    expect(g).toEqual({ total: 590000, taxable: 500000, gst: 90000, cgst: 45000, sgst: 45000 });
  });
  it('never loses a paisa on odd amounts', () => {
    for (const amount of [100, 101, 99999, 550001, 123457]) {
      const g = gstBreakup(amount, 18);
      expect(g.taxable + g.cgst + g.sgst).toBe(amount);
      expect(Math.abs(g.cgst - g.sgst)).toBeLessThanOrEqual(1);
    }
  });
  it('formats PDF-safe rupees', () => {
    expect(formatRs(12345600)).toBe('Rs. 1,23,456.00');
  });
});

describe('verifyRazorpaySignature', () => {
  const secret = 'whsec_test';
  const body = Buffer.from(JSON.stringify({ event: 'payment_link.paid' }));
  const sig = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature over the raw body', () => {
    expect(verifyRazorpaySignature(body, sig, secret)).toBe(true);
    expect(verifyRazorpaySignature(body.toString('utf8'), sig, secret)).toBe(true);
  });
  it('rejects tampered bodies, wrong secrets and missing input', () => {
    expect(verifyRazorpaySignature(Buffer.from('{"event":"x"}'), sig, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, sig, 'other')).toBe(false);
    expect(verifyRazorpaySignature(body, undefined, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, sig, '')).toBe(false);
    expect(verifyRazorpaySignature(body, sig.slice(0, 10), secret)).toBe(false);
  });
});
