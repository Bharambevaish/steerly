import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { APP_NAME, APP_VERSION } from '@/lib/config';
import { Card } from './Card';
import { Chip } from './Chip';
import { ListRow, SectionTitle } from './Feedback';
import { Text } from './Text';
import { useTheme, type ThemePref } from './theme';

/** Theme, notifications, delete account, sign out and version: shared by student and instructor profiles. */
export function SettingsSection() {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const prefs: { id: ThemePref; label: string }[] = [
    { id: 'system', label: 'Auto' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];
  return (
    <>
      <SectionTitle>Settings</SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        <ListRow
          icon={t.dark ? 'moon' : 'sun'}
          title="Appearance"
          right={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {prefs.map((p) => (
                <Chip key={p.id} label={p.label} selected={t.pref === p.id} onPress={() => t.setPref(p.id)} />
              ))}
            </View>
          }
        />
        <ListRow icon="bell" title="Notifications" subtitle="Reminders, payments and updates" onPress={() => router.push('/notifications')} />
        <ListRow icon="trash" title="Delete account" subtitle="Remove your login and personal data" danger onPress={() => router.push('/delete-account')} />
        <ListRow icon="logout" title="Sign out" onPress={() => signOut().catch(() => {}).then(() => router.replace('/'))} />
      </Card>
      <Text variant="caption" faint center>
        {APP_NAME} v{APP_VERSION}
      </Text>
    </>
  );
}
