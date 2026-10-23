import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ADMIN_URL } from '@/lib/config';
import { openUrl } from '@/lib/device';
import { useAuth } from '@/lib/auth';
import { Button, Icon, Screen, Text, useTheme } from '@/ui';

export default function AdminWeb() {
  const t = useTheme();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button title="Open admin dashboard" icon="external" onPress={() => openUrl(ADMIN_URL)} />
          <Button title="Sign out" variant="ghost" icon="logout" onPress={() => signOut().catch(() => {}).then(() => router.replace('/'))} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <LinearGradient colors={t.c.gradient} style={{ width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="monitor" size={46} color={t.c.onBrand} />
        </LinearGradient>
        <Text variant="title">Hi {profile?.name?.split(' ')[0] ?? 'there'}, run your school on the web</Text>
        <Text variant="body" muted>
          Owner and staff accounts use the admin dashboard to manage leads, students, schedules and payments. Log in there with the same phone number.
        </Text>
        <Text variant="bodyStrong" color={t.c.brand}>
          {ADMIN_URL.replace(/^https?:\/\//, '')}
        </Text>
        <Text variant="caption" faint>
          Also give lessons? Ask the owner to turn on “Also teaches” for your account in the dashboard, then reopen this app to get your instructor schedule here.
        </Text>
      </View>
    </Screen>
  );
}
