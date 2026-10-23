import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLLECTIONS, toE164, type Course, type Member, type Student, type UserDoc } from '@steerly/shared';
import { db } from './admin';
import { generateCode } from './codes';
import { as, getMember, sub } from './data';
import { canTeach } from './teaching';

export interface StudentInit {
  id: string;
  name: string;
  phone: string; // 10 digits
  email: string | null;
  course: Course | null;
  instructor: Member | null;
  branchId: string | null;
  feeTotal?: number;
  uid: string | null;
}

export function buildStudent(init: StudentInit): Student {
  const now = Timestamp.now();
  return {
    id: init.id,
    uid: init.uid,
    name: init.name,
    phone: init.phone,
    email: init.email,
    address: null,
    dob: null,
    courseId: init.course?.id ?? '',
    courseName: init.course?.name ?? 'Not enrolled yet',
    instructorId: init.instructor?.uid ?? null,
    instructorName: init.instructor?.name ?? null,
    branchId: init.branchId,
    status: 'active',
    sessionsTotal: init.course?.sessions ?? 0,
    sessionsCompleted: 0,
    feeTotal: init.feeTotal ?? init.course?.price ?? 0,
    feePaid: 0,
    llStatus: 'not_applied',
    llNumber: null,
    dlNumber: null,
    llTestDate: null,
    dlStatus: 'not_applied',
    dlTestDate: null,
    skills: {},
    referralCode: generateCode(6),
    enrolledAt: now,
    createdAt: now,
  };
}

/** Existing student in the school with this 10-digit phone, if any. */
export async function findStudentByPhone(schoolId: string, phone: string): Promise<Student | null> {
  const snap = await sub(schoolId, 'students').where('phone', '==', phone).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as Student);
}

export async function assertNoDuplicateStudent(schoolId: string, phone: string): Promise<void> {
  const existing = await findStudentByPhone(schoolId, phone);
  if (existing) {
    throw new HttpsError('already-exists', `A student with this phone number already exists (id: ${existing.id}).`, {
      studentId: existing.id,
    });
  }
}

/** Instructor member for assignment, or null. Must be an active instructor (or an owner/staff who also teaches). */
export async function resolveInstructor(schoolId: string, instructorId: string | null): Promise<Member | null> {
  if (!instructorId) return null;
  const m = await getMember(schoolId, instructorId);
  if (!canTeach(m)) throw new HttpsError('invalid-argument', 'Please choose an active instructor.');
  return m;
}

/** An Auth user with this phone who has not joined any school yet (so we can link them now). */
export async function findUnlinkedUserByPhone(phone10: string): Promise<UserDoc | null> {
  const snap = await db.collection(COLLECTIONS.users).where('phone', '==', toE164(phone10)).limit(1).get();
  const user = snap.empty ? null : as<UserDoc>(snap.docs[0]);
  return user && !user.schoolId && !user.role ? user : null;
}
