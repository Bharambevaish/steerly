import { Timestamp, type DocumentReference, type WriteBatch } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import type { Member } from '@steerly/shared';
import { db } from './lib/admin';
import { sub } from './lib/data';

const BATCH_LIMIT = 500;

/**
 * Copies a member's new name onto the denormalised `instructorName` of their assigned students,
 * their open/upcoming slots and their upcoming (status 'booked') bookings. Past lessons keep the
 * name they were taught under. Returns the number of documents updated.
 */
export async function syncInstructorName(schoolId: string, uid: string, name: string, nowMs = Date.now()): Promise<number> {
  const [students, slots, bookings] = await Promise.all([
    sub(schoolId, 'students').where('instructorId', '==', uid).get(),
    sub(schoolId, 'slots').where('instructorId', '==', uid).where('start', '>=', Timestamp.fromMillis(nowMs)).get(),
    sub(schoolId, 'bookings').where('instructorId', '==', uid).where('status', '==', 'booked').get(),
  ]);
  const refs: DocumentReference[] = [...students.docs, ...slots.docs, ...bookings.docs]
    .filter((d) => d.get('instructorName') !== name)
    .map((d) => d.ref);

  let batch: WriteBatch = db.batch();
  let inBatch = 0;
  for (const ref of refs) {
    batch.update(ref, { instructorName: name });
    if (++inBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();
  return refs.length;
}

export const onMemberUpdated = onDocumentUpdated('schools/{schoolId}/members/{uid}', async (event) => {
  const before = event.data?.before.data() as Member | undefined;
  const after = event.data?.after.data() as Member | undefined;
  if (!before || !after || !after.name || before.name === after.name) return;
  const { schoolId, uid } = event.params;
  const updated = await syncInstructorName(schoolId, uid, after.name);
  logger.info(`onMemberUpdated: renamed ${uid} → updated ${updated} doc(s)`, { schoolId });
});
