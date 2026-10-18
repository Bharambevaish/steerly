import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSchool } from '@/lib/school';
import { errorMessage } from '@/lib/callables';
import { Button, Card, Icon, Input, Screen, Text, useTheme } from '@/ui';

export default function PickSchool() {
  const t = useTheme();
  const router = useRouter();
  const { lookupCode, pickSchool } = useSchool();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const c = code.trim().toUpperCase();
    if (c.length !== 6) {
      setError('School codes are 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const found = await lookupCode(c);
      if (!found?.schoolId) {
        setError('We couldn’t find a school with that code. Check with your school.');
        return;
      }
      await pickSchool(found.schoolId);
      router.replace('/school');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Find my school" icon="arrowRight" loading={busy} onPress={submit} />
          <Button title="I already have an account" variant="ghost" onPress={() => router.push('/login')} />
        </>
      }
    >
      <Card gradient style={{ marginTop: 12 }}>
        <Icon name="hash" size={30} color={t.c.onBrand} />
        <Text variant="title" color={t.c.onBrand} style={{ marginTop: 12 }}>
          Enter your school code
        </Text>
        <Text variant="body" color={t.c.onBrand} style={{ opacity: 0.85, marginTop: 4 }}>
          Your driving school shares a 6-character code (like PDS4K2). It unlocks their courses and prices.
        </Text>
      </Card>
      <Input
        label="School code"
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABC123"
        maxLength={6}
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
        style={{ letterSpacing: 6, fontFamily: t.font.display, fontSize: 22 }}
      />
    </Screen>
  );
}
