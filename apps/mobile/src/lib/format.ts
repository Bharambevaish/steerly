import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { TIMEZONE, formatINR as sharedFormatINR } from '@steerly/shared';

/** Accepts a Firestore Timestamp, Date, millis or nothing (old/partial docs) and returns a Date or null. */
export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'object' && v && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') {
    try {
      return (v as { toDate(): Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof v === 'object' && v && 'seconds' in v) return new Date(Number((v as { seconds: number }).seconds) * 1000);
  return null;
}

export const formatINR = (paise: number | null | undefined): string => sharedFormatINR(Number(paise) || 0);

export function fmt(v: unknown, pattern: string, fallback = '—'): string {
  const d = toDate(v);
  return d ? formatInTimeZone(d, TIMEZONE, pattern) : fallback;
}

export const fmtTime = (v: unknown) => fmt(v, 'h:mm a');
export const fmtDate = (v: unknown) => fmt(v, 'EEE, d MMM');
export const fmtDateLong = (v: unknown) => fmt(v, 'EEEE, d MMMM yyyy');
export const fmtDateTime = (v: unknown) => fmt(v, 'd MMM, h:mm a');

/** Start of the given day in school time (IST), as a real instant. */
export function startOfSchoolDay(d: Date = new Date()): Date {
  const z = toZonedTime(d, TIMEZONE);
  z.setHours(0, 0, 0, 0);
  return fromZonedTime(z, TIMEZONE);
}

export function schoolDays(count: number, from: Date = new Date()): Date[] {
  const first = startOfSchoolDay(from);
  return Array.from({ length: Math.max(1, count) }, (_, i) => startOfSchoolDay(addDays(first, i)));
}

export const dayKey = (d: Date) => formatInTimeZone(d, TIMEZONE, 'yyyy-MM-dd');

/** "in 2d 4h", "in 35 min", "now" */
export function countdown(target: Date | null, now: number = Date.now()): string {
  if (!target) return '';
  const ms = target.getTime() - now;
  if (ms <= 0) return 'now';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h}h ${min % 60}m`;
  return `in ${Math.floor(h / 24)}d ${h % 24}h`;
}

export function greeting(d: Date = new Date()): string {
  const h = Number(formatInTimeZone(d, TIMEZONE, 'H'));
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'there';

export const initials = (name: string | null | undefined) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

const TEST_LABELS: Record<string, string> = {
  not_applied: 'Not applied',
  applied: 'Applied',
  scheduled: 'Scheduled',
  passed: 'Passed',
  failed: 'Failed',
};
export const testStatusLabel = (s: string | null | undefined) => TEST_LABELS[s ?? ''] ?? 'Not applied';

const VEHICLE_LABELS: Record<string, string> = {
  car_manual: 'Car · Manual',
  car_auto: 'Car · Automatic',
  two_wheeler: 'Two-wheeler',
  heavy: 'Heavy vehicle',
};
export const vehicleLabel = (v: string | null | undefined) => VEHICLE_LABELS[v ?? ''] ?? 'Car';
