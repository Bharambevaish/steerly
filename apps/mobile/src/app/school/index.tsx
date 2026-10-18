import React from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSchool } from '@/lib/school';
import { useCourses } from '@/lib/data';
import { formatINR, vehicleLabel } from '@/lib/format';
import { APP_NAME } from '@/lib/config';
import { Badge, Button, Card, EmptyState, Icon, Row, Screen, SectionTitle, SkeletonList, Text, useTheme } from '@/ui';

export default function SchoolHome() {
  const t = useTheme();
  const router = useRouter();
  const { school, schoolId, locked, pickSchool } = useSchool();
  const courses = useCourses(schoolId);

  if (!schoolId) {
    return (
      <Screen>
        <EmptyState icon="hash" title="Pick your school first" body="Enter the 6-character code your driving school shared." action="Enter code" onAction={() => router.replace('/pick-school')} />
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() => courses.refetch()}
      right={<Button title="Log in" size="sm" variant="secondary" full={false} icon="user" onPress={() => router.push('/login')} />}
      title=" "
    >
      <Card gradient>
        <Row gap={14}>
          {school?.logoUrl ? (
            <Image source={{ uri: school.logoUrl }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#fff' }} contentFit="cover" />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="car" size={28} color={t.c.onBrand} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="label" color={t.c.onBrand} style={{ opacity: 0.8 }}>
              Welcome to
            </Text>
            <Text variant="h2" color={t.c.onBrand} numberOfLines={2}>
              {school?.name ?? APP_NAME}
            </Text>
          </View>
        </Row>
        {school?.city || school?.address ? (
          <Row gap={6} style={{ marginTop: 14 }}>
            <Icon name="pin" size={16} color={t.c.onBrand} />
            <Text variant="small" color={t.c.onBrand} numberOfLines={1} style={{ flex: 1 }}>
              {[school?.address, school?.city].filter(Boolean).join(', ')}
            </Text>
          </Row>
        ) : null}
        <Row style={{ marginTop: 16 }}>
          <Button title="Enquire now" size="md" variant="secondary" full={false} icon="message" onPress={() => router.push('/school/enquire')} />
          {school?.phone ? (
            <Button title="Call" size="md" variant="ghost" full={false} icon="phone" onPress={() => Linking.openURL(`tel:${school.phone}`).catch(() => {})} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          ) : null}
        </Row>
      </Card>

      <SectionTitle>Courses</SectionTitle>
      {courses.loading ? (
        <SkeletonList count={3} h={110} />
      ) : courses.data.length === 0 ? (
        <EmptyState icon="book" title="Courses coming soon" body="This school hasn’t listed courses yet. Send an enquiry and they’ll call you back." action="Send enquiry" onAction={() => router.push('/school/enquire')} />
      ) : (
        courses.data.map((c) => (
          <Card key={c.id} onPress={() => router.push({ pathname: '/school/course/[id]', params: { id: c.id } })}>
            <Row>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="h3">{c.name ?? 'Course'}</Text>
                <Row gap={8} wrap>
                  <Badge label={vehicleLabel(c.vehicleType)} tone="brand" />
                  {c.sessions ? <Badge label={`${c.sessions} sessions`} /> : null}
                  {c.sessionMinutes ? <Badge label={`${c.sessionMinutes} min each`} /> : null}
                </Row>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="h2">{formatINR(c.price)}</Text>
                <Icon name="chevronRight" size={18} color={t.c.textFaint} />
              </View>
            </Row>
          </Card>
        ))
      )}

      {!locked ? (
        <Button title="Switch school" variant="ghost" icon="refresh" onPress={() => pickSchool(null).then(() => router.replace('/pick-school'))} />
      ) : null}
    </Screen>
  );
}
