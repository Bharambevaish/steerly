import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { deleteMyAccountSchema, studentDocumentsCol, type OkOutput, type StudentDocument } from '@steerly/shared';
import { auth, bucket, db } from './lib/admin';
import { subDoc, userRef } from './lib/data';
import { callable, requireAuth } from './lib/guard';

/** Google Play data-deletion: removes the caller's account; school records needed for accounting are kept. */
export const deleteMyAccount = callable(deleteMyAccountSchema, async (_data, request): Promise<OkOutput> => {
  const caller = requireAuth(request);
  const { role, schoolId, studentId } = caller.claims;
  if (role === 'owner') {
    throw new HttpsError('failed-precondition', 'Transfer ownership first: make another member the owner, then delete your account.');
  }
  if (role === 'superAdmin') throw new HttpsError('failed-precondition', 'Remove your administrator role before deleting this account.');

  if (schoolId && studentId) {
    const studentRef = subDoc(schoolId, 'students', studentId);
    if ((await studentRef.get()).exists) await studentRef.update({ uid: null });
    const docs = await db.collection(studentDocumentsCol(schoolId, studentId)).where('verified', '==', false).get();
    for (const d of docs.docs) {
      const doc = d.data() as StudentDocument;
      try {
        if (doc.storagePath) await bucket().file(doc.storagePath).delete({ ignoreNotFound: true });
      } catch (err) {
        logger.warn('deleteMyAccount: storage delete failed', { path: doc.storagePath, err });
      }
      await d.ref.delete();
    }
  }
  if (schoolId && (role === 'staff' || role === 'instructor')) {
    const memberRef = subDoc(schoolId, 'members', caller.uid);
    if ((await memberRef.get()).exists) await memberRef.update({ active: false });
  }

  // users/{uid} plus the notifications subcollection.
  await db.recursiveDelete(userRef(caller.uid));
  if (caller.phone) await db.collection('otpRequests').doc(caller.phone).delete();
  await auth.deleteUser(caller.uid);
  return { ok: true };
});
