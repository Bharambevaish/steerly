import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSchool } from '@/lib/school';
import { useCourses } from '@/lib/data';
import { formatINR, vehicleLabel } from '@/lib/format';
import { Button, Card, EmptyState, Icon, Row, Screen, Skeleton, Text, useTheme, type IconName } from '@/ui';

export default function CourseDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { schoolId } = useSchool();
  const courses = useCourses(schoolId);
  const course = courses.data.find((c) => c.id === id);

  if (courses.loading) {
    return (
      <Screen back title="Course">
        <Skeleton h={180} r={24} />
        <Skeleton h={80} r={24} />
      </Screen>
    );
  }
  if (!course) {
    return (
      <Screen back title="Course">
        <EmptyState icon="book" title="Course not found" body="It may have been removed by the school." />
      </Screen>
    );
  }

  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: 'car', label: 'Vehicle', value: vehicleLabel(course.vehicleType) },
    { icon: 'calendar', label: 'Sessions', value: String(course.sessions ?? '—') },
    { icon: 'clock', label: 'Per session', value: course.sessionMinutes ? `${course.sessionMinutes} min` : '—' },
  ];

  return (
    <Screen
      back
      title={course.name ?? 'Course'}
      footer={<Button title="Enquire about this course" icon="message" onPress={() => router.push({ pathname: '/school/enquire', params: { courseId: course.id } })} />}
    >
      <Card gradient>
        <Text variant="label" color={t.c.onBrand} style={{ opacity: 0.8 }}>
          Course fee
        </Text>
        <Text variant="hero" color={t.c.onBrand}>
          {formatINR(course.price)}
        </Text>
        {course.sessions && course.price ? (
          <Text variant="small" color={t.c.onBrand} style={{ opacity: 0.85 }}>
            about {formatINR(Math.round(course.price / course.sessions))} per session
          </Text>
        ) : null}
      </Card>
      <Row gap={10}>
        {facts.map((f) => (
          <Card key={f.label} style={{ flex: 1 }} padded>
            <Icon name={f.icon} size={20} color={t.c.brand} />
            <Text variant="caption" muted style={{ marginTop: 8 }}>
              {f.label}
            </Text>
            <Text variant="bodyStrong" numberOfLines={2}>
              {f.value}
            </Text>
          </Card>
        ))}
      </Row>
      {course.description ? (
        <Card>
          <Text variant="h3">What you’ll learn</Text>
          <View style={{ height: 6 }} />
          <Text variant="body" muted>
            {course.description}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
