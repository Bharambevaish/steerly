import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { inboxCol, type InboxNotification } from '@steerly/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useInbox } from '@/lib/data';
import { resolveLink } from '@/lib/links';
import { fmtDateTime } from '@/lib/format';
import type { WithId } from '@/lib/live';
import { Banner, Card, EmptyState, Icon, IconButton, Row, Screen, SkeletonList, Text, useTheme, type IconName } from '@/ui';

const ICON: Record<string, IconName> = {
  lesson_reminder: 'clock',
  payment: 'card',
  booking: 'calendar',
  test_date: 'award',
  enquiry: 'message',
  general: 'bell',
};

export default function Notifications() {
  const t = useTheme();
  const router = useRouter();
  const { user, role, canTeach } = useAuth();
  const inbox = useInbox();

  const open = async (n: WithId<Partial<InboxNotification>>) => {
    if (!user) return;
    if (!n.read) updateDoc(doc(db, inboxCol(user.uid), n.id), { read: true }).catch(() => {});
    if (n.link) router.push(resolveLink(n.link, role, canTeach));
  };

  return (
    <Screen back title="Notifications" onRefresh={() => inbox.refetch()}>
      {inbox.error && !inbox.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {inbox.loading ? (
        <SkeletonList count={4} h={76} />
      ) : inbox.data.length === 0 ? (
        <EmptyState icon="bell" title="All caught up" body="Lesson reminders, payment updates and school news land here." />
      ) : (
        inbox.data.map((n) => (
          <Card key={n.id} onPress={() => open(n)} tone={n.read ? undefined : 'brand'}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface }}>
                <Icon name={ICON[n.type ?? ''] ?? 'bell'} size={19} color={t.c.brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{n.title ?? 'Update'}</Text>
                {n.body ? (
                  <Text variant="small" muted>
                    {n.body}
                  </Text>
                ) : null}
                <Text variant="caption" faint>
                  {fmtDateTime(n.createdAt)}
                </Text>
              </View>
              <IconButton
                icon="x"
                size={32}
                label="Dismiss"
                onPress={() => user && deleteDoc(doc(db, inboxCol(user.uid), n.id)).catch(() => {})}
              />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
