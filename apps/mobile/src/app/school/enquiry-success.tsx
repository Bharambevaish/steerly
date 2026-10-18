import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSchool } from '@/lib/school';
import { Button, Icon, Screen, Text, haptic, useTheme } from '@/ui';

export default function EnquirySuccess() {
  const t = useTheme();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const { school } = useSchool();
  useEffect(() => {
    haptic.success();
  }, []);
  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button title="Back to courses" onPress={() => router.replace('/school')} />
          <Button title="I have an account — log in" variant="ghost" onPress={() => router.push('/login')} />
        </>
      }
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <LinearGradient colors={t.c.gradient} style={{ width: 110, height: 110, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={56} color={t.c.onBrand} strokeWidth={3} />
        </LinearGradient>
        <Text variant="title" center>
          You’re on the list{name ? `, ${name}` : ''}!
        </Text>
        <Text variant="body" muted center>
          {school?.name ?? 'The school'} will call you soon to plan your first lesson. Keep your phone handy.
        </Text>
      </View>
    </Screen>
  );
}
