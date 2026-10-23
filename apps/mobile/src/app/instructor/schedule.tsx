import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { addDays } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { schoolCol, type Slot } from '@steerly/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useInstructorSlots } from '@/lib/data';
import { errorMessage } from '@/lib/callables';
import { dayKey, fmt, fmtTime, schoolDays, toDate } from '@/lib/format';
import type { WithId } from '@/lib/live';
import { Banner, Card, EmptyState, IconButton, Row, Screen, SkeletonList, Text, haptic, useTheme, useToast } from '@/ui';

type S = WithId<Partial<Slot>>;

export default function Schedule() {
  const t = useTheme();
  const toast = useToast();
  const { claims } = useAuth();
  const [week, setWeek] = useState(0);
  const days = useMemo(() => schoolDays(7, addDays(new Date(), week * 7)), [week]);
  const from = days[0]!;
  const to = useMemo(() => addDays(days[6]!, 1), [days]);
  const slots = useInstructorSlots(from, to);
  const [pending, setPending] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, S[]>();
    for (const s of slots.data) {
      const d = toDate(s.start);
      if (!d) continue;
      const k = dayKey(d);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots.data]);

  const toggle = async (s: S) => {
    if (!claims.schoolId || (s.status !== 'open' && s.status !== 'blocked')) return;
    if ((toDate(s.start)?.getTime() ?? 0) < Date.now()) return;
    const next = s.status === 'open' ? 'blocked' : 'open';
    setPending(s.id);
    haptic.select();
    try {
      // Rules allow instructors to flip their own slots between open and blocked.
      await updateDoc(doc(db, schoolCol(claims.schoolId, 'slots'), s.id), { status: next });
      toast.show(next === 'blocked' ? 'Slot blocked' : 'Slot reopened', 'success');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const counts = {
    open: slots.data.filter((s) => s.status === 'open').length,
    booked: slots.data.filter((s) => s.status === 'booked').length,
    blocked: slots.data.filter((s) => s.status === 'blocked').length,
  };

  return (
    <Screen
      title="Schedule"
      subtitle={`${fmt(from, 'd MMM')} – ${fmt(days[6], 'd MMM')}`}
      onRefresh={() => slots.refetch()}
      right={
        <Row gap={8}>
          <IconButton icon="chevronLeft" label="Previous week" onPress={() => setWeek((w) => Math.max(-4, w - 1))} />
          <IconButton icon="chevronRight" label="Next week" onPress={() => setWeek((w) => Math.min(8, w + 1))} />
        </Row>
      }
    >
      <Row gap={10}>
        {(
          [
            ['Open', counts.open, t.c.success],
            ['Booked', counts.booked, t.c.brand],
            ['Blocked', counts.blocked, t.c.textMuted],
          ] as const
        ).map(([label, n, color]) => (
          <Card key={label} style={{ flex: 1 }}>
            <Text variant="number" color={color}>
              {n}
            </Text>
            <Text variant="caption" muted>
              {label}
            </Text>
          </Card>
        ))}
      </Row>
      <Text variant="caption" faint>
        Tap an open slot to block it (e.g. for a break), tap again to reopen.
      </Text>

      {slots.error && !slots.data.length ? <Banner tone="danger" text="Couldn’t load this. Pull down to retry." /> : null}
      {slots.loading ? (
        <SkeletonList count={4} h={90} />
      ) : slots.data.length === 0 ? (
        <EmptyState icon="calendar" title="No slots this week" body="Your school generates slots from your weekly availability. Ask the office if this looks wrong." />
      ) : (
        days.map((d) => {
          const list = byDay.get(dayKey(d)) ?? [];
          if (!list.length) return null;
          return (
            <View key={dayKey(d)} style={{ gap: 8 }}>
              <Text variant="h3">{fmt(d, 'EEEE, d MMM')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {list.map((s) => {
                  const color = s.status === 'booked' ? t.c.brand : s.status === 'blocked' ? t.c.textFaint : t.c.success;
                  const past = (toDate(s.start)?.getTime() ?? 0) < Date.now();
                  return (
                    <Pressable
                      key={s.id}
                      disabled={s.status === 'booked' || past || pending === s.id}
                      onPress={() => toggle(s)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: color,
                        backgroundColor: s.status === 'booked' ? t.c.brandSoft : t.c.surface,
                        opacity: past ? 0.45 : pressed || pending === s.id ? 0.6 : 1,
                        minWidth: 96,
                      })}
                    >
                      <Text variant="bodyStrong" style={{ textDecorationLine: s.status === 'blocked' ? 'line-through' : 'none' }}>
                        {fmtTime(s.start)}
                      </Text>
                      <Text variant="caption" color={color}>
                        {s.status === 'booked' ? 'Booked' : s.status === 'blocked' ? 'Blocked' : 'Open'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}
