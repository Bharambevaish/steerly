import type { DocumentReference, DocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  COLLECTIONS,
  schoolCol,
  type Booking,
  type Course,
  type Member,
  type Payment,
  type School,
  type SchoolSubcollection,
  type Student,
  type UserDoc,
} from '@steerly/shared';
import { db } from './admin';

export const userRef = (uid: string) => db.collection(COLLECTIONS.users).doc(uid);
export const schoolRef = (schoolId: string) => db.collection(COLLECTIONS.schools).doc(schoolId);
export const sub = (schoolId: string, name: SchoolSubcollection) => db.collection(schoolCol(schoolId, name));
export const subDoc = (schoolId: string, name: SchoolSubcollection, id: string) => sub(schoolId, name).doc(id);

/** Typed read of a snapshot (shapes are defined in @steerly/shared/models). */
export function as<T>(snap: DocumentSnapshot): T | null {
  return snap.exists ? (snap.data() as T) : null;
}

async function read(ref: DocumentReference, tx?: Transaction): Promise<DocumentSnapshot> {
  return tx ? tx.get(ref) : ref.get();
}

async function must<T>(ref: DocumentReference, what: string, tx?: Transaction): Promise<T> {
  const value = as<T>(await read(ref, tx));
  if (!value) throw new HttpsError('not-found', `${what} not found.`);
  return value;
}

export const getSchool = (id: string, tx?: Transaction) => must<School>(schoolRef(id), 'School', tx);
export const getStudent = (sid: string, id: string, tx?: Transaction) => must<Student>(subDoc(sid, 'students', id), 'Student', tx);
export const getCourse = (sid: string, id: string, tx?: Transaction) => must<Course>(subDoc(sid, 'courses', id), 'Course', tx);
export const getBooking = (sid: string, id: string, tx?: Transaction) => must<Booking>(subDoc(sid, 'bookings', id), 'Booking', tx);
export const getPayment = (sid: string, id: string, tx?: Transaction) => must<Payment>(subDoc(sid, 'payments', id), 'Payment', tx);
export const getMember = (sid: string, uid: string, tx?: Transaction) => must<Member>(subDoc(sid, 'members', uid), 'Member', tx);
export const getUser = async (uid: string) => as<UserDoc>(await userRef(uid).get());

/** Blocks writes for suspended schools. */
export function assertSchoolUsable(school: School): void {
  if (school.subscription?.status === 'suspended') {
    throw new HttpsError('failed-precondition', 'This school account is suspended. Please contact Steerly support.');
  }
}

/** Parent school id of a document under schools/{id}/... */
export function schoolIdOf(ref: DocumentReference): string {
  const school = ref.parent.parent;
  if (!school) throw new Error(`Not a school sub-document: ${ref.path}`);
  return school.id;
}
