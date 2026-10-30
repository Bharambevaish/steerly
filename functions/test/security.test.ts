import { describe, expect, it } from 'vitest';
import { bumpHourlyCounter, hashIp } from '../src/lib/otp';
import { maskPhone } from '../src/lib/securityLog';

const HOUR = 3_600_000;

describe('bumpHourlyCounter (per-IP OTP limit)', () => {
  it('starts a new window on first hit', () => {
    expect(bumpHourlyCounter(null, 3, 1000)).toEqual({ windowStartMs: 1000, count: 1 });
  });
  it('counts within the window and blocks at the max', () => {
    let c = bumpHourlyCounter(null, 3, 0)!;
    c = bumpHourlyCounter(c, 3, 10)!;
    c = bumpHourlyCounter(c, 3, 20)!;
    expect(c.count).toBe(3);
    expect(bumpHourlyCounter(c, 3, 30)).toBeNull();
  });
  it('resets after an hour', () => {
    const full = { windowStartMs: 0, count: 3 };
    expect(bumpHourlyCounter(full, 3, HOUR)).toEqual({ windowStartMs: HOUR, count: 1 });
  });
});

describe('hashIp', () => {
  it('is stable, salted and never contains the raw IP', () => {
    const a = hashIp('203.0.113.7', 's1');
    expect(a).toBe(hashIp('203.0.113.7', 's1'));
    expect(a).not.toBe(hashIp('203.0.113.7', 's2'));
    expect(a).not.toContain('203');
    expect(a).toHaveLength(32);
  });
});

describe('maskPhone', () => {
  it('keeps only the last 4 digits', () => {
    expect(maskPhone('+919876543210')).toBe('******3210');
    expect(maskPhone('9876543210')).toBe('******3210');
    expect(maskPhone(null)).toBeNull();
  });
});
