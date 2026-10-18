import React from 'react';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { useMyAssignedStudents } from '@/lib/data';
import { Avatar, Badge, Card, Row, Screen, Text } from '@/ui';
import { SettingsSection } from '@/ui/SettingsSection';

export default function InstructorProfile() {
  const { profile, user } = useAuth();
  const { school } = useSchool();
  const students = useMyAssignedStudents();
  return (
    <Screen title="Profile">
      <Card>
        <Row gap={14}>
          <Avatar name={profile?.name} size={60} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h2" numberOfLines={1}>
              {profile?.name ?? 'Instructor'}
            </Text>
            <Text variant="small" muted>
              {profile?.phone ?? user?.phoneNumber ?? ''}
            </Text>
            <Row gap={8}>
              <Badge label="Instructor" tone="brand" />
              {school?.name ? <Badge label={school.name} /> : null}
            </Row>
          </View>
        </Row>
      </Card>
      <Card>
        <Text variant="number">{students.data.filter((s) => (s.status ?? 'active') === 'active').length}</Text>
        <Text variant="caption" muted>
          active students assigned to you
        </Text>
      </Card>
      <SettingsSection />
    </Screen>
  );
}
