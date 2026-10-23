import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase/firestore';
import { TIMEZONE, formatINR, toPaise, toRupees, type FsTimestamp } from '@steerly/shared';

export { formatINR, toPaise, toRupees };

type TsLike = FsTimestamp | Timestamp | Date | null | undefined;

export function toDate(ts: TsLike): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as FsTimestamp).toDate === 'function') return (ts as FsTimestamp).toDate();
  return null;
}

/** Format a timestamp in school time (Asia/Kolkata). */
export function fmt(ts: TsLike, pattern = 'd MMM yyyy'): string {
  const d = toDate(ts);
  return d ? formatInTimeZone(d, TIMEZONE, pattern) : '—';
}

export const fmtDateTime = (ts: TsLike) => fmt(ts, 'd MMM yyyy, h:mm a');
export const fmtTime = (ts: TsLike) => fmt(ts, 'h:mm a');

export function timeAgo(ts: TsLike): string {
  const d = toDate(ts);
  if (!d) return 'Just now';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmt(d);
}

// ---------- IST calendar-day helpers (dates as "YYYY-MM-DD" strings) ----------

/** Today's date in IST as YYYY-MM-DD (or the IST date of `at`, epoch ms). */
export const todayYmd = (at: number = Date.now()): string => formatInTimeZone(at, TIMEZONE, 'yyyy-MM-dd');

/** Add days to a YYYY-MM-DD string (calendar arithmetic, timezone-independent). */
export const addDaysYmd = (ymd: string, n: number): string => format(addDays(parseISO(ymd), n), 'yyyy-MM-dd');

/** Monday of the week containing ymd. */
export function weekStartYmd(ymd: string): string {
  const dow = parseISO(ymd).getDay(); // 0 = Sun
  return addDaysYmd(ymd, dow === 0 ? -6 : 1 - dow);
}

/** IST midnight (or given HH:mm) of a YYYY-MM-DD date as a JS Date. */
export const istDate = (ymd: string, hhmm = '00:00'): Date => fromZonedTime(`${ymd}T${hhmm}:00`, TIMEZONE);

/** Timestamp → YYYY-MM-DD in IST (for <input type="date">). */
export const tsToYmd = (ts: TsLike): string => {
  const d = toDate(ts);
  return d ? formatInTimeZone(d, TIMEZONE, 'yyyy-MM-dd') : '';
};

/** YYYY-MM-DD → Timestamp at IST midnight, or null when empty. */
export const ymdToTs = (ymd: string, hhmm = '00:00'): Timestamp | null =>
  ymd ? Timestamp.fromDate(istDate(ymd, hhmm)) : null;

export const ymdLabel = (ymd: string, pattern = 'EEE d MMM'): string => format(parseISO(ymd), pattern);

/** Whole days from now until ts (negative when past). */
export function daysUntil(ts: TsLike): number | null {
  const d = toDate(ts);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/** First moment of the IST month containing `at` (default now). */
export function monthStart(at: number = Date.now()): Date {
  return istDate(`${formatInTimeZone(at, TIMEZONE, 'yyyy-MM')}-01`);
}

// ---------- Contact links ----------

export const telLink = (phone10: string) => `tel:+91${phone10.replace(/\D/g, '').slice(-10)}`;
export const waLink = (phone10: string, text?: string) =>
  `https://wa.me/91${phone10.replace(/\D/g, '').slice(-10)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const waShareLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://steerly.app').replace(/\/$/, '');

// ---------- CSV ----------

export function downloadCsv(fileName: string, rows: (string | number | null | undefined)[][]): void {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** "#F59E0B" → "245 158 11" for rgb(var(--brand) / a). */
export function hexToRgbChannels(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export const VEHICLE_TYPE_LABELS = {
  car_manual: 'Car (manual)',
  car_auto: 'Car (automatic)',
  two_wheeler: 'Two-wheeler',
  heavy: 'Heavy vehicle',
} as const;

export const TEST_STATUS_LABELS = {
  not_applied: 'Not applied',
  applied: 'Applied',
  scheduled: 'Scheduled',
  passed: 'Passed',
  failed: 'Failed',
} as const;

export const PAYMENT_METHOD_LABELS = {
  razorpay: 'Online',
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
} as const;

export const SOURCE_LABELS: Record<string, string> = {
  app: 'App',
  web: 'Website',
  walk_in: 'Walk-in',
  phone: 'Phone',
  referral: 'Referral',
};
