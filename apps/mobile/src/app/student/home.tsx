import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { skillProgress } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { useInbox, useMyBookings, useMyStudent } from '@/lib/data';
import { useNow } from '@/lib/live';
import { usePay } from '@/lib/payments';
import { countdown, firstName, fmtDate, fmtTime, formatINR, greeting, testStatusLabel, toDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  ProgressBar,
  ProgressRing,
  Row,
  Screen,
  Skeleton,
  Text,
  useTheme,
  useToast,
  type IconName,
} from '@/ui';

export default function StudentHome() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const { school } = useSchool();
  const student = useMyStudent();
  const bookings = useMyBookings();
  const inbox = useInbox();
  const now = useNow(30000);
  const { pay, paying } = usePay();

  const s = student.data;
  const next = useMemo(
    () => bookings.data.find((b) => b.status === 'booked' && (toDate(b.end)?.getTime() ?? toDate(b.start)?.getTime() ?? 0) > now),
    [bookings.data, now],
  );
  const unread = inbox.data.filter((n) => !n.read).length;
  const progress = skillProgress(s?.skills ?? {});
  const done = s?.sessionsCompleted ?? 0;
  const total = s?.sessionsTotal ?? 0;
  const due = Math.max(0, (s?.feeTotal ?? 0) - (s?.feePaid ?? 0));

  const onPay = async () => {
    try {
      await pay(due);
    } catch (e) {
      toast.error(e);
    }
  };

  const quick: { icon: IconName; label: string; go: () => void }[] = [
    { icon: 'calendar', label: 'Book', go: () => router.push('/student/book') },
    { icon: 'file', label: 'Documents', go: () => router.push('/documents') },
    { icon: 'receipt', label: 'Payments', go: () => router.push('/payments') },
    { icon: 'trending', label: 'Skills', go: () => router.push('/student/progress') },
  ];

  return (
    <Screen
      onRefresh={() => Promise.all([student.refetch(), bookings.refetch()])}
      right={
        <View>
          <IconButton icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          {unread ? (
            <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: t.c.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <Text variant="caption" color="#fff" style={{ fontSize: 10, lineHeight: 12 }}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </View>
      }
      title={`${greeting()}, ${firstName(s?.name ?? profile?.name)}`}
      subtitle={school?.name}
    >
      {/* Next lesson */}
      {bookings.loading ? (
        <Skeleton h={150} r={24} />
      ) : next ? (
        <Card gradient onPress={() => router.push('/student/lessons')}>
          <Row>
            <Text variant="label" color={t.c.onBrand} style={{ flex: 1, opacity: 0.85 }}>
              Next lesson
            </Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text variant="caption" color={t.c.onBrand}>
                {countdown(toDate(next.start), now)}
              </Text>
            </View>
          </Row>
          <Text variant="hero" color={t.c.onBrand} style={{ marginTop: 8 }}>
            {fmtTime(next.start)}
          </Text>
          <Text variant="bodyStrong" color={t.c.onBrand}>
            {fmtDate(next.start)} · with {next.instructorName ?? 'your instructor'}
          </Text>
        </Card>
      ) : (
        <Card tone="brand" onPress={() => router.push('/student/book')}>
          <Row>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="h3">No lesson booked</Text>
              <Text variant="small" muted>
                Grab an open slot before it’s gone.
              </Text>
            </View>
            <Button title="Book" size="sm" full={false} icon="plus" onPress={() => router.push('/student/book')} />
          </Row>
        </Card>
      )}

      {/* Progress */}
      {student.loading ? (
        <Skeleton h={160} r={24} />
      ) : (
        <Card onPress={() => router.push('/student/progress')}>
          <Row gap={18}>
            <ProgressRing value={progress} size={112} sublabel="skills" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="label" muted>
                Sessions
              </Text>
              <Text variant="number">
                {done}
                <Text variant="h3" muted>
                  {' '}
                  / {total || '—'}
                </Text>
              </Text>
              <ProgressBar value={total ? done / total : 0} />
              <Text variant="small" muted numberOfLines={1}>
                {s?.courseName ?? 'Your course'}
              </Text>
            </View>
          </Row>
        </Card>
      )}

      {/* Fees */}
      {s && (s.feeTotal ?? 0) > 0 ? (
        <Card>
          <Row>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" muted>
                {due > 0 ? 'Fee due' : 'Fees'}
              </Text>
              <Text variant="number" color={due > 0 ? t.c.text : t.c.success}>
                {due > 0 ? formatINR(due) : 'All paid'}
              </Text>
              <Text variant="small" muted>
                {formatINR(s.feePaid)} paid of {formatINR(s.feeTotal)}
              </Text>
            </View>
            {due >= 100 ? <Button title="Pay" size="md" full={false} icon="card" loading={paying} onPress={onPay} /> : <Icon name="checkCircle" size={32} color={t.c.success} />}
          </Row>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={s.feeTotal ? (s.feePaid ?? 0) / s.feeTotal : 0} color={t.c.success} />
          </View>
        </Card>
      ) : null}

      {/* Tests */}
      {s ? (
        <Row gap={12}>
          <TestCard label="Learner’s licence" status={s.llStatus} date={s.llTestDate} />
          <TestCard label="Driving licence" status={s.dlStatus} date={s.dlTestDate} />
        </Row>
      ) : null}

      {/* Quick actions */}
      <Row gap={10}>
        {quick.map((q) => (
          <Card key={q.label} onPress={q.go} style={{ flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 }} padded={false}>
            <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: t.c.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={q.icon} size={20} color={t.c.brand} />
            </View>
            <Text variant="caption" style={{ marginTop: 6 }}>
              {q.label}
            </Text>
          </Card>
        ))}
      </Row>
    </Screen>
  );
}

function TestCard({ label, status, date }: { label: string; status?: string | null; date?: unknown }) {
  const tone = status === 'passed' ? 'success' : status === 'failed' ? 'danger' : status === 'scheduled' ? 'brand' : 'neutral';
  return (
    <Card style={{ flex: 1, gap: 8 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Badge label={testStatusLabel(status)} tone={tone} />
      {toDate(date) ? <Text variant="small">{fmtDate(date)}</Text> : null}
    </Card>
  );
}
