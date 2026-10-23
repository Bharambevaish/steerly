import { describe, expect, it } from 'vitest';
import { canTeach } from '../src/lib/teaching';

describe('canTeach', () => {
  it('active instructors always teach', () => {
    expect(canTeach({ role: 'instructor', active: true })).toBe(true);
    expect(canTeach({ role: 'instructor', active: true, teaches: false })).toBe(true);
  });
  it('owners/staff teach only with teaches=true', () => {
    expect(canTeach({ role: 'owner', active: true })).toBe(false);
    expect(canTeach({ role: 'owner', active: true, teaches: true })).toBe(true);
    expect(canTeach({ role: 'staff', active: true, teaches: true })).toBe(true);
    expect(canTeach({ role: 'staff', active: true, teaches: false })).toBe(false);
  });
  it('inactive members and missing docs never teach', () => {
    expect(canTeach({ role: 'instructor', active: false })).toBe(false);
    expect(canTeach({ role: 'owner', active: false, teaches: true })).toBe(false);
    expect(canTeach(null)).toBe(false);
  });
});
