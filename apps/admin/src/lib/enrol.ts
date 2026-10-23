import type { Course } from '@steerly/shared';
import { toPaise } from './format';

export interface EnrolValues {
  courseId: string;
  instructorId: string;
  branchId: string;
  /** Rupees as typed; empty = course price. */
  fee: string;
}

export const emptyEnrol: EnrolValues = { courseId: '', instructorId: '', branchId: '', fee: '' };

/** Initial values: the preferred course if it's still offered, else the first active course. */
export function initialEnrol(courses: Course[], preferredCourseId?: string | null): EnrolValues {
  const active = courses.filter((c) => c.active !== false);
  const pick = active.find((c) => c.id === preferredCourseId) ?? active[0];
  return { ...emptyEnrol, courseId: pick?.id ?? '' };
}

/** Fields for createStudent / convertEnquiry. Throws if the fee override isn't a valid amount. */
export function enrolPayload(v: EnrolValues) {
  const fee = v.fee.trim();
  const feeTotal = fee === '' ? undefined : toPaise(Number(fee));
  if (feeTotal !== undefined && !(Number.isFinite(feeTotal) && feeTotal >= 0)) throw new Error('Enter a valid fee amount.');
  return {
    courseId: v.courseId,
    instructorId: v.instructorId || null,
    branchId: v.branchId || null,
    ...(feeTotal !== undefined ? { feeTotal } : {}),
  };
}
