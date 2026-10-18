import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { joinSchoolSchema } from '@steerly/shared';
import { api, errorMessage } from '@/lib/callables';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { Button, Card, Icon, Input, Screen, Text, useTheme, useToast } from '@/ui';

export default function Join() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { refreshClaims, signOut, profile } = useAuth();
  const { school } = useSchool();
  const [code, setCode] = useState(school?.code ?? '');
  const [name, setName] = useState(profile?.name ?? '');
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = joinSchoolSchema.safeParse({ code, name });
    if (!parsed.success) {
      const e: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'code') e.code = 'School codes are 6 characters.';
        if (issue.path[0] === 'name') e.name = 'Please enter your full name.';
      }
      setErrors(e);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await api.joinSchool(parsed.data);
      await refreshClaims();
      toast.success('Welcome aboard!');
      router.replace('/');
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t join that school. Check the code and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Join school" icon="arrowRight" loading={busy} onPress={submit} />
          <Button title="Sign out" variant="ghost" onPress={() => signOut().then(() => router.replace('/'))} />
        </>
      }
    >
      <Card gradient style={{ marginTop: 12 }}>
        <Icon name="sparkle" size={28} color={t.c.onBrand} />
        <Text variant="title" color={t.c.onBrand} style={{ marginTop: 12 }}>
          Almost there
        </Text>
        <Text variant="body" color={t.c.onBrand} style={{ opacity: 0.85, marginTop: 4 }}>
          We couldn’t find you in a school yet. Enter your school’s code to join as a student.
        </Text>
      </Card>
      <Input label="Your full name" icon="user" value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
      <Input
        label="School code"
        icon="hash"
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
        autoCapitalize="characters"
        maxLength={6}
        placeholder="ABC123"
        error={errors.code}
      />
      <Text variant="caption" faint>
        Are you an instructor or staff member? Ask your school owner to invite your phone number, then log in again.
      </Text>
    </Screen>
  );
}
