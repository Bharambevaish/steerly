import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { TIMEZONE } from '@steerly/shared';

export const DAY_MS = 24 * 60 * 60_000;
export const HOUR_MS = 60 * 60_000;

/** IST calendar date "YYYY-MM-DD" of an instant. */
export const istDate = (ms: number): string => formatInTimeZone(ms, TIMEZONE, 'yyyy-MM-dd');
export const istYear = (ms: number): number => Number(formatInTimeZone(ms, TIMEZONE, 'yyyy'));
/** "10:30 AM, Mon 12 Oct" */
export const istLabel = (ms: number): string => formatInTimeZone(ms, TIMEZONE, 'h:mm a, EEE d MMM');
export const istDateLabel = (ms: number): string => formatInTimeZone(ms, TIMEZONE, 'd MMM yyyy');

/** Epoch millis of 00:00 IST on a "YYYY-MM-DD" date. India has no DST, so a day is always 24h. */
export const istDayStart = (date: string): number => fromZonedTime(`${date}T00:00:00`, TIMEZONE).getTime();

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m - 1, d];
}

/** "YYYY-MM-DD" + n days (pure calendar arithmetic). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / DAY_MS);
}
