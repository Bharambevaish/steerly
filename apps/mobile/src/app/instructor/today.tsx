import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { addDays } from 'date-fns';
import { SKILLS, type Booking, type SkillId, type SkillLevel } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { callPhone } from '@/lib/device';
import { useInstructorBookings, useStudent } from '@/lib/data';
import { useNow, type WithId } from '@/lib/live';
import { api } from '@/lib/callables';
import { countdown, firstName, fmtDateLong, fmtTime, greeting, startOfSchoolDay, toDate } from '@/lib/format';
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Row,
  Screen,
  Sheet,
  SkeletonList,
  Stepper,
  Text,
  haptic,
  useTheme,
  useToast,
} from '@/ui';

type B = WithId<Partial<Booking>>;

export default function Today() {
  const t = useTheme();
  const { profile } = useAuth();
  const now = useNow(30000);
  const from = useMemo(() => startOfSchoolDay(new Date(now)), [Math.floor(now / 3600000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const to = useMemo(() => addDays(from, 1), [from]);
  const bookings = useInstructorBookings(from, to);
  const [completing, setCompleting] = useState<B | null>(null);

  const active = bookings.data.filter((b) => b.status !== 'cancelled');
  const done = active.filter((b) => b.status === 'completed' || b.status === 'no_show').length;
  const next = active.find((b) => b.status === 'booked' && (toDate(b.end)?.getTime() ?? 0) > now);

  return (
    <Screen title={`${greeting()}, ${firstName(profile?.name)}`} subtitle={fmtDateLong(from)} onRefresh={() => bookings.refetch()}>
      <Card gradient>
        <Row>
          <View style={{ flex: 1 }}>
            <Text variant="label" color={t.c.onBrand} style={{ opacity: 0.85 }}>
              Today
            </Text>
            <Text variant="hero" color={t.c.onBrand}>
              {done}/{active.length}
            </Text>
            <Text variant="small" color={t.c.onBrand} style={{ opacity: 0.85 }}>
              lessons done
            </Text>
          </View>
          {next ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" color={t.c.onBrand} style={{ opacity: 0.85 }}>
                Next {countdown(toDate(next.start), now)}
              </Text>
              <Text variant="h2" color={t.c.onBrand}>
                {fmtTime(next.start)}
              </Text>
              <Text variant="small" color={t.c.onBrand} numberOfLines={1}>
                {next.studentName ?? 'Student'}
              </Text>
            </View>
          ) : null}
        </Row>
      </Card>

      {bookings.error && !bookings.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {bookings.loading ? (
        <SkeletonList count={4} h={96} />
      ) : bookings.data.length === 0 ? (
        <EmptyState icon="calendar" title="No lessons today" body="Enjoy the breather. New bookings appear here instantly." />
      ) : (
        bookings.data.map((b) => <LessonCard key={b.id} b={b} now={now} onComplete={() => setCompleting(b)} />)
      )}

      {completing ? <CompleteSheet booking={completing} onClose={() => setCompleting(null)} /> : null}
    </Screen>
  );
}

function LessonCard({ b, now, onComplete }: { b: B; now: number; onComplete: () => void }) {
  const t = useTheme();
  const start = toDate(b.start)?.getTime() ?? 0;
  const end = toDate(b.end)?.getTime() ?? start;
  const live = b.status === 'booked' && now >= start && now <= end;
  const badge =
    b.status === 'completed'
      ? { label: 'Done', tone: 'success' as const }
      : b.status === 'no_show'
        ? { label: 'No-show', tone: 'danger' as const }
        : b.status === 'cancelled'
          ? { label: 'Cancelled', tone: 'neutral' as const }
          : live
            ? { label: 'Now', tone: 'brand' as const }
            : { label: 'Booked', tone: 'info' as const };
  return (
    <Card style={{ gap: 12, opacity: b.status === 'cancelled' ? 0.6 : 1 }}>
      <Row>
        <View style={{ width: 64 }}>
          <Text variant="h3">{fmtTime(b.start)}</Text>
          <Text variant="caption" faint>
            {fmtTime(b.end)}
          </Text>
        </View>
        <Avatar name={b.studentName} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {b.studentName ?? 'Student'}
          </Text>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        {b.studentPhone ? (
          <IconButton icon="phone" label={`Call ${b.studentName ?? 'student'}`} bg={t.c.brandSoft} color={t.c.brand} onPress={() => callPhone(b.studentPhone)} />
        ) : null}
      </Row>
      {b.status === 'booked' && now >= start - 30 * 60000 ? (
        <Button title={live ? 'Complete lesson' : now > end ? 'Mark attendance' : 'Start & complete'} size="md" icon="checkCircle" onPress={onComplete} />
      ) : null}
      {b.instructorNotes ? (
        <Text variant="small" muted numberOfLines={2}>
          {b.instructorNotes}
        </Text>
      ) : null}
    </Card>
  );
}

function CompleteSheet({ booking, onClose }: { booking: B; onClose: () => void }) {
  const toast = useToast();
  const { claims } = useAuth();
  const student = useStudent(booking.studentId);
  const [attendance, setAttendance] = useState<'present' | 'no_show'>('present');
  const [covered, setCovered] = useState<SkillId[]>([]);
  const [levels, setLevels] = useState<Partial<Record<SkillId, SkillLevel>>>({});
  const [original, setOriginal] = useState<Partial<Record<SkillId, SkillLevel>>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    // Seed steppers once with the student's current levels; later snapshots must not wipe edits.
    if (seeded || !student.data) return;
    const s = student.data.skills ?? {};
    setOriginal(s);
    setLevels(s);
    setSeeded(true);
  }, [seeded, student.data]);

  const toggle = (id: SkillId) => setCovered((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const submit = async () => {
    if (!claims.schoolId) return;
    setBusy(true);
    try {
      const changed: Partial<Record<SkillId, SkillLevel>> = {};
      for (const s of SKILLS) {
        const v = levels[s.id];
        if (v !== undefined && v !== (original[s.id] ?? 0)) changed[s.id] = v;
      }
      await api.completeBooking({
        schoolId: claims.schoolId,
        bookingId: booking.id,
        attendance,
        skillsCovered: attendance === 'present' ? covered : [],
        skillLevels: attendance === 'present' ? changed : {},
        notes: notes.trim(),
      });
      haptic.success();
      toast.success(attendance === 'present' ? 'Lesson completed' : 'Marked as no-show');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={booking.studentName ?? 'Complete lesson'} footer={<Button title="Save lesson" icon="check" loading={busy} onPress={submit} />}>
      <Text variant="caption" muted>
        Attendance
      </Text>
      <Row gap={8}>
        <Chip label="Present" selected={attendance === 'present'} onPress={() => setAttendance('present')} />
        <Chip label="No-show" selected={attendance === 'no_show'} onPress={() => setAttendance('no_show')} />
      </Row>
      {attendance === 'present' ? (
        <>
          <Text variant="caption" muted>
            Skills covered
          </Text>
          <Row wrap gap={8}>
            {SKILLS.map((s) => (
              <Chip key={s.id} label={s.label} selected={covered.includes(s.id)} onPress={() => toggle(s.id)} />
            ))}
          </Row>
          <Text variant="caption" muted>
            Skill levels (0 not started · 3 confident)
          </Text>
          {SKILLS.map((s) => (
            <Row key={s.id}>
              <Text variant="small" style={{ flex: 1 }}>
                {s.label}
              </Text>
              <Stepper value={levels[s.id] ?? 0} onChange={(v) => setLevels((l) => ({ ...l, [s.id]: v as SkillLevel }))} />
            </Row>
          ))}
        </>
      ) : null}
      <Input label="Notes for the student" value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="What went well, what to practise next" />
    </Sheet>
  );
}
