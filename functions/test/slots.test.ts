import { describe, expect, it } from 'vitest';
import { buildSlots, slotId, slotRangeError, weekdayOf } from '../src/lib/slots';
import { addDays, daysBetween, istDate, istDayStart } from '../src/lib/time';

const IST = (iso: string) => Date.parse(`${iso}+05:30`);
const MON = '2026-10-19'; // a Monday

describe('weekdayOf / date helpers', () => {
  it('maps calendar dates to weekdays', () => {
    expect(weekdayOf(MON)).toBe('mon');
    expect(weekdayOf('2026-10-25')).toBe('sun');
  });
  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-10-01', '2026-11-01')).toBe(31);
  });
  it('IST day boundaries are 18:30 UTC the previous day', () => {
    expect(new Date(istDayStart('2026-10-19')).toISOString()).toBe('2026-10-18T18:30:00.000Z');
    expect(istDate(Date.parse('2026-10-18T18:29:59Z'))).toBe('2026-10-18');
    expect(istDate(Date.parse('2026-10-18T18:30:00Z'))).toBe('2026-10-19');
  });
});

describe('buildSlots', () => {
  const now = IST('2026-10-18T12:00:00');

  it('builds lesson-length slots in IST within each range', () => {
    const { slots, past } = buildSlots({
      weekly: { mon: [{ start: '07:00', end: '10:00' }] },
      from: MON,
      to: MON,
      lessonMinutes: 60,
      nowMs: now,
    });
    expect(past).toBe(0);
    expect(slots.map((s) => s.startMs)).toEqual([IST('2026-10-19T07:00:00'), IST('2026-10-19T08:00:00'), IST('2026-10-19T09:00:00')]);
    expect(slots[0].endMs - slots[0].startMs).toBe(3600_000);
    expect(new Date(slots[0].startMs).toISOString()).toBe('2026-10-19T01:30:00.000Z');
  });

  it('drops a trailing partial slot', () => {
    const { slots } = buildSlots({ weekly: { mon: [{ start: '07:00', end: '08:30' }] }, from: MON, to: MON, lessonMinutes: 60, nowMs: now });
    expect(slots).toHaveLength(1);
  });

  it('handles late-evening ranges that cross UTC midnight', () => {
    const { slots } = buildSlots({ weekly: { mon: [{ start: '22:00', end: '23:59' }] }, from: MON, to: MON, lessonMinutes: 45, nowMs: now });
    expect(slots.map((s) => istDate(s.startMs))).toEqual([MON, MON]);
  });

  it('skips past slots and counts them', () => {
    const { slots, past } = buildSlots({
      weekly: { mon: [{ start: '07:00', end: '10:00' }] },
      from: MON,
      to: MON,
      lessonMinutes: 60,
      nowMs: IST('2026-10-19T08:00:00'),
    });
    expect(past).toBe(2); // 07:00 and 08:00 (starting now counts as past)
    expect(slots).toHaveLength(1);
  });

  it('covers every matching weekday in an inclusive range, ignoring bad and overlapping ranges', () => {
    const { slots } = buildSlots({
      weekly: {
        mon: [{ start: '07:00', end: '08:00' }, { start: '07:00', end: '08:00' }],
        wed: [{ start: '7am', end: '9am' }],
      },
      from: MON,
      to: addDays(MON, 14),
      lessonMinutes: 60,
      nowMs: now,
    });
    expect(slots.map((s) => istDate(s.startMs))).toEqual(['2026-10-19', '2026-10-26', '2026-11-02']);
  });

  it('creates deterministic ids', () => {
    expect(slotId('ins1', 1700000000000)).toBe('ins1_1700000000000');
  });
});

describe('slotRangeError', () => {
  it('accepts up to 31 days and rejects reversed or longer ranges', () => {
    expect(slotRangeError('2026-10-01', '2026-11-01')).toBeNull();
    expect(slotRangeError('2026-10-01', '2026-11-02')).toMatch(/at most 31/);
    expect(slotRangeError('2026-10-02', '2026-10-01')).toMatch(/end date/);
  });
});
