import React from 'react';
import { View } from 'react-native';
import { isAdminRole } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { ADMIN_URL } from '@/lib/config';
import { openUrl } from '@/lib/device';
import { useSchool } from '@/lib/school';
import { useMyAssignedStudents } from '@/lib/data';
import { Avatar, Badge, Card, Icon, ListRow, Row, Screen, Text, useTheme } from '@/ui';
import { SettingsSection } from '@/ui/SettingsSection';

export default function InstructorProfile() {
  const { profile, user, role } = useAuth();
  const isAdmin = isAdminRole(role);
  const t = useTheme();
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
              <Badge label={role === 'owner' ? 'Owner · Instructor' : role === 'staff' ? 'Staff · Instructor' : 'Instructor'} tone="brand" />
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
      {isAdmin ? (
        <Card style={{ paddingVertical: 6 }}>
          <ListRow
            icon="monitor"
            title="Open admin dashboard"
            subtitle={`Manage your school at ${ADMIN_URL.replace(/^https?:\/\//, '')}`}
            right={<Icon name="external" size={18} color={t.c.textFaint} />}
            onPress={() => openUrl(ADMIN_URL)}
          />
        </Card>
      ) : null}
      <SettingsSection />
    </Screen>
  );
}
