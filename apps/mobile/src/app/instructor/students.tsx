import React from 'react';
import { View } from 'react-native';
import { skillProgress } from '@steerly/shared';
import { useMyAssignedStudents } from '@/lib/data';
import { callPhone } from '@/lib/device';
import { Avatar, Badge, Banner, Card, EmptyState, IconButton, ProgressBar, Row, Screen, SkeletonList, Text, useTheme } from '@/ui';

export default function Students() {
  const t = useTheme();
  const students = useMyAssignedStudents();
  const active = students.data.filter((s) => (s.status ?? 'active') === 'active');
  const others = students.data.filter((s) => (s.status ?? 'active') !== 'active');

  return (
    <Screen title="My students" subtitle={`${active.length} active`} onRefresh={() => students.refetch()}>
      {students.error && !students.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {students.loading ? (
        <SkeletonList count={4} h={96} />
      ) : students.data.length === 0 ? (
        <EmptyState icon="users" title="No students assigned yet" body="When the office assigns students to you, they’ll show up here." />
      ) : (
        [...active, ...others].map((s) => {
          const pct = skillProgress(s.skills ?? {});
          const done = s.sessionsCompleted ?? 0;
          const total = s.sessionsTotal ?? 0;
          return (
            <Card key={s.id} style={{ gap: 12, opacity: s.status && s.status !== 'active' ? 0.6 : 1 }}>
              <Row>
                <Avatar name={s.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {s.name ?? 'Student'}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {s.courseName ?? ''}
                  </Text>
                </View>
                {s.status && s.status !== 'active' ? <Badge label={s.status === 'completed' ? 'Completed' : 'Dropped'} /> : null}
                {s.phone ? (
                  <IconButton icon="phone" label={`Call ${s.name ?? 'student'}`} bg={t.c.brandSoft} color={t.c.brand} onPress={() => callPhone(s.phone)} />
                ) : null}
              </Row>
              <Row gap={16}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text variant="caption" muted>
                    Skills {pct}%
                  </Text>
                  <ProgressBar value={pct / 100} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text variant="caption" muted>
                    Sessions {done}/{total || '—'}
                  </Text>
                  <ProgressBar value={total ? done / total : 0} color={t.c.success} />
                </View>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
