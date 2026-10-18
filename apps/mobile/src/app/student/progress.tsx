import React from 'react';
import { View } from 'react-native';
import { SKILLS, SKILL_LEVEL_LABELS, skillProgress, type SkillLevel } from '@steerly/shared';
import { useMyStudent } from '@/lib/data';
import { Card, ProgressBar, ProgressRing, Row, Screen, Skeleton, Text, useTheme } from '@/ui';

export default function Progress() {
  const t = useTheme();
  const student = useMyStudent();
  const skills = student.data?.skills ?? {};
  const pct = skillProgress(skills);
  const confident = SKILLS.filter((s) => skills[s.id] === 3).length;
  const levelColor = (l: number) => (l >= 3 ? t.c.success : l === 2 ? t.c.brand : l === 1 ? t.c.warning : t.c.textFaint);

  return (
    <Screen title="Your progress" onRefresh={() => student.refetch()}>
      {student.loading ? (
        <Skeleton h={160} r={24} />
      ) : (
        <Card gradient>
          <Row gap={18}>
            <View style={{ backgroundColor: t.c.surface, borderRadius: 70, padding: 6 }}>
              <ProgressRing value={pct} size={110} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="label" color={t.c.onBrand} style={{ opacity: 0.85 }}>
                Confident in
              </Text>
              <Text variant="hero" color={t.c.onBrand}>
                {confident}/{SKILLS.length}
              </Text>
              <Text variant="small" color={t.c.onBrand} style={{ opacity: 0.85 }}>
                skills. Your instructor updates these after each lesson.
              </Text>
            </View>
          </Row>
        </Card>
      )}
      {SKILLS.map((s) => {
        const lvl = (skills[s.id] ?? 0) as SkillLevel;
        return (
          <Card key={s.id} style={{ gap: 10 }}>
            <Row>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {s.label}
              </Text>
              <Text variant="caption" color={levelColor(lvl)}>
                {SKILL_LEVEL_LABELS[lvl] ?? SKILL_LEVEL_LABELS[0]}
              </Text>
            </Row>
            <ProgressBar value={lvl / 3} color={levelColor(lvl)} />
          </Card>
        );
      })}
    </Screen>
  );
}
