import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays } from 'date-fns';
import type { Slot } from '@steerly/shared';
import { useSchool } from '@/lib/school';
import { useOpenSlots } from '@/lib/data';
import { api } from '@/lib/callables';
import { dayKey, fmt, fmtDateLong, fmtTime, schoolDays, toDate } from '@/lib/format';
import type { WithId } from '@/lib/live';
import { Avatar, Banner, Button, Card, EmptyState, Icon, Row, Screen, Sheet, SkeletonList, Text, haptic, useTheme, useToast } from '@/ui';

export default function Book() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { schoolId, settings } = useSchool();
  const days = useMemo(() => schoolDays(Math.min(Math.max(settings.bookingWindowDays || 14, 1), 60)), [settings.bookingWindowDays]);
  const [selected, setSelected] = useState(0);
  const dayStart = days[selected] ?? days[0]!;
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);
  const slots = useOpenSlots(dayStart, dayEnd);
  const [pick, setPick] = useState<WithId<Partial<Slot>> | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = slots.data.filter((s) => (toDate(s.start)?.getTime() ?? 0) > Date.now());

  const confirm = async () => {
    if (!pick || !schoolId) return;
    setBusy(true);
    try {
      await api.bookSlot({ schoolId, slotId: pick.id });
      haptic.success();
      toast.success(`Booked for ${fmtTime(pick.start)} on ${fmt(pick.start, 'EEE d MMM')}`);
      setPick(null);
      router.push('/student/lessons');
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Book a lesson" subtitle={`Up to ${days.length} days ahead`} onRefresh={() => slots.refetch()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
        {days.map((d, i) => {
          const on = i === selected;
          return (
            <Pressable
              key={dayKey(d)}
              onPress={() => {
                haptic.select();
                setSelected(i);
              }}
              style={{
                width: 62,
                paddingVertical: 12,
                borderRadius: 20,
                alignItems: 'center',
                gap: 2,
                backgroundColor: on ? t.c.brand : t.c.surface,
                borderWidth: on ? 0 : 1,
                borderColor: t.c.border,
              }}
            >
              <Text variant="caption" color={on ? t.c.onBrand : t.c.textMuted}>
                {i === 0 ? 'Today' : fmt(d, 'EEE')}
              </Text>
              <Text variant="h2" color={on ? t.c.onBrand : t.c.text}>
                {fmt(d, 'd')}
              </Text>
              <Text variant="caption" color={on ? t.c.onBrand : t.c.textFaint} style={{ fontSize: 10 }}>
                {fmt(d, 'MMM')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="h3">{fmtDateLong(dayStart)}</Text>
      {slots.error ? <Banner tone="danger" text="Couldn’t load slots. Pull down to retry." /> : null}
      {slots.loading ? (
        <SkeletonList count={4} h={72} />
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar" title="No open slots this day" body="Try another date. New slots open up as instructors publish their schedule." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {visible.map((s) => (
            <Card key={s.id} onPress={() => setPick(s)} style={{ width: '48%' }}>
              <Text variant="h2">{fmtTime(s.start)}</Text>
              <Text variant="small" muted numberOfLines={1}>
                to {fmtTime(s.end)}
              </Text>
              <Row gap={6} style={{ marginTop: 8 }}>
                <Icon name="user" size={14} color={t.c.textMuted} />
                <Text variant="caption" muted numberOfLines={1} style={{ flex: 1 }}>
                  {s.instructorName ?? 'Instructor'}
                </Text>
              </Row>
            </Card>
          ))}
        </View>
      )}

      <Sheet
        visible={!!pick}
        onClose={() => setPick(null)}
        title="Confirm booking"
        footer={<Button title="Book this slot" icon="check" loading={busy} onPress={confirm} />}
      >
        {pick ? (
          <Card tone="brand">
            <Text variant="label" muted>
              {fmtDateLong(pick.start)}
            </Text>
            <Text variant="hero">{fmtTime(pick.start)}</Text>
            <Text variant="body" muted>
              until {fmtTime(pick.end)}
            </Text>
            <Row style={{ marginTop: 14 }}>
              <Avatar name={pick.instructorName} size={36} />
              <Text variant="bodyStrong">{pick.instructorName ?? 'Your instructor'}</Text>
            </Row>
          </Card>
        ) : null}
        <Text variant="small" muted>
          You can cancel up to {settings.cancelBeforeHours} hours before the lesson. Max {settings.maxBookingsPerDay} lesson
          {settings.maxBookingsPerDay === 1 ? '' : 's'} per day.
        </Text>
      </Sheet>
    </Screen>
  );
}
