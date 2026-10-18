import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  convertEnquirySchema,
  createStudentSchema,
  type EnquiryDoc,
  type StudentCreatedOutput,
} from '@steerly/shared';
import { db } from './lib/admin';
import { setClaims } from './lib/claims';
import { as, assertSchoolUsable, getCourse, getSchool, sub, subDoc } from './lib/data';
import { ADMIN, assertRole, callable } from './lib/guard';
import { assertNoDuplicateStudent, buildStudent, findUnlinkedUserByPhone, resolveInstructor } from './lib/studentRecord';

interface NewStudentArgs {
  schoolId: string;
  courseId: string;
  instructorId: string | null;
  branchId: string | null;
  feeTotal?: number;
  name: string;
  phone: string;
  email: string | null;
}

/** Validates, builds and returns the student (not yet written) plus the user to link afterwards. */
async function prepareStudent(args: NewStudentArgs) {
  assertSchoolUsable(await getSchool(args.schoolId));
  await assertNoDuplicateStudent(args.schoolId, args.phone);
  const course = await getCourse(args.schoolId, args.courseId);
  if (!course.active) throw new HttpsError('failed-precondition', 'This course is no longer offered.');
  const instructor = await resolveInstructor(args.schoolId, args.instructorId);
  const user = await findUnlinkedUserByPhone(args.phone);
  const ref = sub(args.schoolId, 'students').doc();
  const student = buildStudent({
    id: ref.id,
    name: args.name,
    phone: args.phone,
    email: args.email ?? user?.email ?? null,
    course,
    instructor,
    branchId: args.branchId,
    feeTotal: args.feeTotal,
    uid: user?.uid ?? null,
  });
  return { ref, student, linkUid: user?.uid ?? null };
}

async function linkIfNeeded(linkUid: string | null, schoolId: string, studentId: string): Promise<void> {
  if (linkUid) await setClaims(linkUid, { role: 'student', schoolId, studentId });
}

export const createStudent = callable(createStudentSchema, async (data, request): Promise<StudentCreatedOutput> => {
  assertRole(request, data.schoolId, ADMIN);
  const { ref, student, linkUid } = await prepareStudent(data);
  await ref.create(student);
  await linkIfNeeded(linkUid, data.schoolId, student.id);
  return { studentId: student.id };
});

export const convertEnquiry = callable(convertEnquirySchema, async (data, request): Promise<StudentCreatedOutput> => {
  assertRole(request, data.schoolId, ADMIN);
  const enquiryRef = subDoc(data.schoolId, 'enquiries', data.enquiryId);
  const enquiry = as<EnquiryDoc>(await enquiryRef.get());
  if (!enquiry) throw new HttpsError('not-found', 'Enquiry not found.');
  if (enquiry.studentId) {
    throw new HttpsError('already-exists', 'This enquiry has already been converted to a student.', { studentId: enquiry.studentId });
  }
  const { ref, student, linkUid } = await prepareStudent({ ...data, name: enquiry.name, phone: enquiry.phone, email: null });
  const batch = db.batch();
  batch.create(ref, student);
  batch.update(enquiryRef, { status: 'Enrolled', studentId: student.id, updatedAt: Timestamp.now() });
  await batch.commit();
  await linkIfNeeded(linkUid, data.schoolId, student.id);
  return { studentId: student.id };
});
