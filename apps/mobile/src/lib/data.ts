// Domain hooks. Each wraps a live Firestore query; the query shape matches what firestore.rules
// allows for the caller's role (e.g. bookings filtered by studentId / instructorId).
import { useMemo } from 'react';
import { collection, doc, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import {
  inboxCol,
  schoolCol,
  studentDocumentsCol,
  type Booking,
  type Course,
  type InboxNotification,
  type Payment,
  type Slot,
  type Student,
  type StudentDocument,
} from '@steerly/shared';
import { db } from './firebase';
import { useAuth } from './auth';
import { useSchool } from './school';
import { useLiveDoc, useLiveQuery } from './live';
import { toDate } from './format';

export function useCourses(schoolId: string | null) {
  const q = useMemo(() => (schoolId ? query(collection(db, schoolCol(schoolId, 'courses'))) : null), [schoolId]);
  const res = useLiveQuery<Partial<Course>>(['courses', schoolId], q);
  const data = useMemo(
    () => res.data.filter((c) => c.active !== false).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name ?? '').localeCompare(b.name ?? '')),
    [res.data],
  );
  return { ...res, data };
}

export function useMyStudent() {
  const { claims } = useAuth();
  const { schoolId, studentId } = claims;
  const ref = useMemo(() => (schoolId && studentId ? doc(db, schoolCol(schoolId, 'students'), studentId) : null), [schoolId, studentId]);
  return useLiveDoc<Partial<Student>>(['student', schoolId, studentId], ref);
}

const byStart = (a: { start?: unknown }, b: { start?: unknown }) => (toDate(a.start)?.getTime() ?? 0) - (toDate(b.start)?.getTime() ?? 0);

export function useMyBookings() {
  const { claims } = useAuth();
  const { schoolId, studentId } = claims;
  const q = useMemo(
    () => (schoolId && studentId ? query(collection(db, schoolCol(schoolId, 'bookings')), where('studentId', '==', studentId), limit(200)) : null),
    [schoolId, studentId],
  );
  const res = useLiveQuery<Partial<Booking>>(['myBookings', schoolId, studentId], q);
  const data = useMemo(() => [...res.data].sort(byStart), [res.data]);
  return { ...res, data };
}

export function useOpenSlots(dayStart: Date, dayEnd: Date) {
  const { schoolId } = useSchool();
  const from = dayStart.getTime();
  const to = dayEnd.getTime();
  const q = useMemo(
    () =>
      schoolId
        ? query(
            collection(db, schoolCol(schoolId, 'slots')),
            where('status', '==', 'open'),
            where('start', '>=', Timestamp.fromMillis(from)),
            where('start', '<', Timestamp.fromMillis(to)),
            orderBy('start'),
          )
        : null,
    [schoolId, from, to],
  );
  return useLiveQuery<Partial<Slot>>(['openSlots', schoolId, from, to], q);
}

export function useMyPayments() {
  const { claims } = useAuth();
  const { schoolId, studentId } = claims;
  const q = useMemo(
    () => (schoolId && studentId ? query(collection(db, schoolCol(schoolId, 'payments')), where('studentId', '==', studentId), limit(100)) : null),
    [schoolId, studentId],
  );
  const res = useLiveQuery<Partial<Payment>>(['payments', schoolId, studentId], q);
  const data = useMemo(
    () => [...res.data].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)),
    [res.data],
  );
  return { ...res, data };
}

export function useMyDocuments() {
  const { claims } = useAuth();
  const { schoolId, studentId } = claims;
  const q = useMemo(
    () => (schoolId && studentId ? query(collection(db, studentDocumentsCol(schoolId, studentId))) : null),
    [schoolId, studentId],
  );
  const res = useLiveQuery<Partial<StudentDocument>>(['documents', schoolId, studentId], q);
  const data = useMemo(
    () => [...res.data].sort((a, b) => (toDate(b.uploadedAt)?.getTime() ?? 0) - (toDate(a.uploadedAt)?.getTime() ?? 0)),
    [res.data],
  );
  return { ...res, data };
}

export function useInbox() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const q = useMemo(() => (uid ? query(collection(db, inboxCol(uid)), orderBy('createdAt', 'desc'), limit(50)) : null), [uid]);
  return useLiveQuery<Partial<InboxNotification>>(['inbox', uid], q);
}

/** Instructor: my bookings with start in [from, to). */
export function useInstructorBookings(from: Date, to: Date) {
  const { user, claims } = useAuth();
  const uid = user?.uid ?? null;
  const schoolId = claims.schoolId ?? null;
  const a = from.getTime();
  const b = to.getTime();
  const q = useMemo(
    () =>
      uid && schoolId
        ? query(
            collection(db, schoolCol(schoolId, 'bookings')),
            where('instructorId', '==', uid),
            where('start', '>=', Timestamp.fromMillis(a)),
            where('start', '<', Timestamp.fromMillis(b)),
            orderBy('start'),
          )
        : null,
    [uid, schoolId, a, b],
  );
  return useLiveQuery<Partial<Booking>>(['instructorBookings', schoolId, uid, a, b], q);
}

/** Instructor: my slots with start in [from, to). */
export function useInstructorSlots(from: Date, to: Date) {
  const { user, claims } = useAuth();
  const uid = user?.uid ?? null;
  const schoolId = claims.schoolId ?? null;
  const a = from.getTime();
  const b = to.getTime();
  const q = useMemo(
    () =>
      uid && schoolId
        ? query(
            collection(db, schoolCol(schoolId, 'slots')),
            where('instructorId', '==', uid),
            where('start', '>=', Timestamp.fromMillis(a)),
            where('start', '<', Timestamp.fromMillis(b)),
            orderBy('start'),
          )
        : null,
    [uid, schoolId, a, b],
  );
  return useLiveQuery<Partial<Slot>>(['instructorSlots', schoolId, uid, a, b], q);
}

/** Instructor: students assigned to me. */
export function useMyAssignedStudents() {
  const { user, claims } = useAuth();
  const uid = user?.uid ?? null;
  const schoolId = claims.schoolId ?? null;
  const q = useMemo(
    () => (uid && schoolId ? query(collection(db, schoolCol(schoolId, 'students')), where('instructorId', '==', uid)) : null),
    [uid, schoolId],
  );
  const res = useLiveQuery<Partial<Student>>(['assignedStudents', schoolId, uid], q);
  const data = useMemo(() => [...res.data].sort((x, y) => (x.name ?? '').localeCompare(y.name ?? '')), [res.data]);
  return { ...res, data };
}

/** Instructor: one student (for the complete-lesson sheet's current skill levels). */
export function useStudent(studentId: string | null | undefined) {
  const { claims } = useAuth();
  const schoolId = claims.schoolId ?? null;
  const ref = useMemo(() => (schoolId && studentId ? doc(db, schoolCol(schoolId, 'students'), studentId) : null), [schoolId, studentId]);
  return useLiveDoc<Partial<Student>>(['student', schoolId, studentId], ref);
}
