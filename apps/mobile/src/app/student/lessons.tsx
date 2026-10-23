import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SKILLS, type Booking } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { useMyBookings } from '@/lib/data';
import { api } from '@/lib/callables';
import { fmtDate, fmtTime, toDate } from '@/lib/format';
import { useNow, type WithId } from '@/lib/live';
import { Badge, Banner, Button, Card, Chip, EmptyState, Icon, Input, Row, Screen, Sheet, SkeletonList, Text, haptic, useTheme, useToast } from '@/ui';

type B = WithId<Partial<Booking>>;
const skillLabel = (id: string) => SKILLS.find((s) => s.id === id)?.label ?? id;

const STATUS: Record<string, { label: string; tone: 'brand' | 'success' | 'danger' | 'neutral' | 'warning' }> = {
  booked: { label: 'Booked', tone: 'brand' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'Missed', tone: 'danger' },
};

export default function Lessons() {
  const t = useTheme();
  const toast = useToast();
  const { claims } = useAuth();
  const { settings } = useSchool();
  const bookings = useMyBookings();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<B | null>(null);
  const [rating, setRating] = useState<B | null>(null);
  const [reason, setReason] = useState('');
  const [stars, setStars] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const now = useNow(60000);
  const { upcoming, past } = useMemo(() => {
    const up: B[] = [];
    const pa: B[] = [];
    for (const b of bookings.data) {
      const end = toDate(b.end)?.getTime() ?? toDate(b.start)?.getTime() ?? 0;
      if (b.status === 'booked' && end > now) up.push(b);
      else pa.push(b);
    }
    return { upcoming: up, past: pa.reverse() };
  }, [bookings.data, now]);

  const list = tab === 'upcoming' ? upcoming : past;

  const doCancel = async () => {
    if (!cancelling || !claims.schoolId) return;
    setBusy(true);
    try {
      await api.cancelBooking({ schoolId: claims.schoolId, bookingId: cancelling.id, reason: reason.trim() });
      toast.success('Lesson cancelled');
      setCancelling(null);
      setReason('');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const doRate = async () => {
    if (!rating || !claims.schoolId || stars < 1) return;
    setBusy(true);
    try {
      await api.rateBooking({ schoolId: claims.schoolId, bookingId: rating.id, rating: stars, feedback: feedback.trim() });
      toast.success('Thanks for the feedback!');
      setRating(null);
      setStars(0);
      setFeedback('');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Lessons" onRefresh={() => bookings.refetch()}>
      <Row gap={8}>
        <Chip label={`Upcoming (${upcoming.length})`} selected={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
        <Chip label={`Past (${past.length})`} selected={tab === 'past'} onPress={() => setTab('past')} />
      </Row>

      {bookings.error && !bookings.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {bookings.loading ? (
        <SkeletonList count={3} h={110} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={tab === 'upcoming' ? 'calendar' : 'clock'}
          title={tab === 'upcoming' ? 'Nothing booked yet' : 'No past lessons'}
          body={tab === 'upcoming' ? 'Head to Book to grab your next slot.' : 'Completed lessons and instructor notes show up here.'}
        />
      ) : (
        list.map((b) => {
          const st = STATUS[b.status ?? ''] ?? { label: b.status ?? '—', tone: 'neutral' as const };
          const start = toDate(b.start);
          const canCancel = b.status === 'booked' && !!start && start.getTime() - now > (settings.cancelBeforeHours ?? 0) * 3600_000;
          return (
            <Card key={b.id} style={{ gap: 10 }}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">
                    {fmtDate(b.start)} · {fmtTime(b.start)}
                  </Text>
                  <Text variant="small" muted>
                    with {b.instructorName ?? 'instructor'}
                  </Text>
                </View>
                <Badge label={st.label} tone={st.tone} />
              </Row>
              {b.skillsCovered?.length ? (
                <Row wrap gap={6}>
                  {b.skillsCovered.map((s) => (
                    <Badge key={s} label={skillLabel(s)} tone="info" />
                  ))}
                </Row>
              ) : null}
              {b.instructorNotes ? (
                <View style={{ backgroundColor: t.c.surfaceAlt, borderRadius: 16, padding: 12, gap: 4 }}>
                  <Text variant="caption" muted>
                    Instructor notes
                  </Text>
                  <Text variant="small">{b.instructorNotes}</Text>
                </View>
              ) : null}
              {b.status === 'cancelled' && b.cancelReason ? (
                <Text variant="small" muted>
                  Reason: {b.cancelReason}
                </Text>
              ) : null}
              {b.status === 'booked' ? (
                canCancel ? (
                  <Button title="Cancel lesson" size="sm" variant="secondary" full={false} icon="x" onPress={() => setCancelling(b)} />
                ) : (
                  <Text variant="caption" faint>
                    Cancellations close {settings.cancelBeforeHours}h before the lesson. Call your school if plans change.
                  </Text>
                )
              ) : null}
              {b.status === 'completed' ? (
                b.rating ? (
                  <Row gap={2}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Icon key={n} name="star" size={16} color={t.c.brand} fill={n <= (b.rating ?? 0) ? t.c.brand : 'none'} />
                    ))}
                    {b.feedback ? (
                      <Text variant="caption" muted numberOfLines={1} style={{ marginLeft: 8, flex: 1 }}>
                        “{b.feedback}”
                      </Text>
                    ) : null}
                  </Row>
                ) : (
                  <Button title="Rate this lesson" size="sm" variant="secondary" full={false} icon="star" onPress={() => setRating(b)} />
                )
              ) : null}
            </Card>
          );
        })
      )}

      <Sheet
        visible={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel lesson?"
        footer={
          <>
            <Button title="Yes, cancel it" variant="danger" loading={busy} onPress={doCancel} />
            <Button title="Keep my lesson" variant="ghost" onPress={() => setCancelling(null)} />
          </>
        }
      >
        <Text variant="body" muted>
          {cancelling ? `${fmtDate(cancelling.start)} at ${fmtTime(cancelling.start)} with ${cancelling.instructorName ?? 'your instructor'}.` : ''}
        </Text>
        <Input label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="e.g. exam, feeling unwell" maxLength={200} multiline />
      </Sheet>

      <Sheet
        visible={!!rating}
        onClose={() => setRating(null)}
        title="How was your lesson?"
        footer={<Button title="Submit rating" loading={busy} disabled={stars < 1} onPress={doRate} />}
      >
        <Row gap={10} style={{ justifyContent: 'center', paddingVertical: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
              onPress={() => {
                haptic.select();
                setStars(n);
              }}
            >
              <Icon name="star" size={40} color={t.c.brand} fill={n <= stars ? t.c.brand : 'none'} />
            </Pressable>
          ))}
        </Row>
        <Input label="Anything to share? (optional)" value={feedback} onChangeText={setFeedback} maxLength={500} multiline />
      </Sheet>
    </Screen>
  );
}
