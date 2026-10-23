import { fromZonedTime } from 'date-fns-tz';
import { TIMEZONE, type TimeRange, type Weekday } from '@steerly/shared';
import { addDays, daysBetween } from './time';

export const MAX_SLOT_RANGE_DAYS = 31;
const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface SlotTime {
  startMs: number;
  endMs: number;
}

export interface BuildSlotsInput {
  weekly: Partial<Record<Weekday, TimeRange[]>>;
  from: string; // YYYY-MM-DD
  to: string; // inclusive
  lessonMinutes: number;
  nowMs: number;
  timeZone?: string;
}

export function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Returns a user-facing error message when the range is invalid, else null. */
export function slotRangeError(from: string, to: string): string | null {
  const days = daysBetween(from, to);
  if (days < 0) return 'The end date must be on or after the start date.';
  if (days > MAX_SLOT_RANGE_DAYS) return `You can generate at most ${MAX_SLOT_RANGE_DAYS} days of slots at once.`;
  return null;
}

/** Lesson slots for each working range in [from, to], in school-local time. Past slots are counted, not returned. */
export function buildSlots(input: BuildSlotsInput): { slots: SlotTime[]; past: number } {
  const { weekly, from, to, lessonMinutes, nowMs } = input;
  const tz = input.timeZone ?? TIMEZONE;
  const lessonMs = lessonMinutes * 60_000;
  const slots: SlotTime[] = [];
  const seen = new Set<number>();
  let past = 0;
  if (lessonMinutes <= 0 || daysBetween(from, to) < 0) return { slots, past };
  for (let date = from; daysBetween(date, to) >= 0; date = addDays(date, 1)) {
    for (const range of weekly[weekdayOf(date)] ?? []) {
      if (!HHMM.test(range.start) || !HHMM.test(range.end)) continue;
      const rangeStart = fromZonedTime(`${date}T${range.start}:00`, tz).getTime();
      const rangeEnd = fromZonedTime(`${date}T${range.end}:00`, tz).getTime();
      for (let s = rangeStart; s + lessonMs <= rangeEnd; s += lessonMs) {
        if (seen.has(s)) continue; // overlapping ranges
        seen.add(s);
        if (s <= nowMs) past++;
        else slots.push({ startMs: s, endMs: s + lessonMs });
      }
    }
  }
  slots.sort((a, b) => a.startMs - b.startMs);
  return { slots, past };
}

export const slotId = (instructorId: string, startMs: number): string => `${instructorId}_${startMs}`;
