import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { inboxCol, type InboxNotification, type Member, type UserDoc } from '@steerly/shared';
import { db } from './admin';
import { sub, userRef } from './data';

export interface NotifyPayload {
  title: string;
  body: string;
  type: InboxNotification['type'];
  link?: string | null;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH = 100;

/** Writes an inbox item for each user and sends an Expo push where a token exists. Never throws. */
type Uid = string | null | undefined;
export async function notify(uids: Uid | readonly Uid[], payload: NotifyPayload): Promise<void> {
  const raw: readonly Uid[] = Array.isArray(uids) ? uids : [uids as Uid];
  const list = [...new Set(raw.filter((u): u is string => !!u))];
  if (list.length === 0) return;
  try {
    const batch = db.batch();
    for (const uid of list) {
      const ref = db.collection(inboxCol(uid)).doc();
      const item: InboxNotification = {
        id: ref.id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        read: false,
        link: payload.link ?? null,
        createdAt: Timestamp.now(),
      };
      batch.set(ref, item);
    }
    await batch.commit();
  } catch (err) {
    logger.error('notify: inbox write failed', err);
  }
  await sendPush(list, payload);
}

async function sendPush(uids: string[], payload: NotifyPayload): Promise<void> {
  try {
    const snaps = await db.getAll(...uids.map((u) => userRef(u)));
    const tokens = snaps
      .map((s) => (s.data() as UserDoc | undefined)?.expoPushToken)
      .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken'));
    for (let i = 0; i < tokens.length; i += EXPO_BATCH) {
      const messages = tokens.slice(i, i + EXPO_BATCH).map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: { type: payload.type, link: payload.link ?? null },
      }));
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) logger.warn('notify: Expo push failed', { status: res.status });
    }
  } catch (err) {
    logger.warn('notify: Expo push error', err);
  }
}

/** Active owners and staff of a school. */
export async function schoolAdminUids(schoolId: string): Promise<string[]> {
  const snap = await sub(schoolId, 'members').where('role', 'in', ['owner', 'staff']).get();
  return snap.docs.map((d) => d.data() as Member).filter((m) => m.active).map((m) => m.uid);
}

export async function notifySchoolAdmins(schoolId: string, payload: NotifyPayload): Promise<void> {
  try {
    await notify(await schoolAdminUids(schoolId), payload);
  } catch (err) {
    logger.error('notifySchoolAdmins failed', err);
  }
}
