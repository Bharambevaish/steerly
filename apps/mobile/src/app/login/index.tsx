import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { phoneSchema } from '@steerly/shared';
import { api, errorMessage } from '@/lib/callables';
import { APP_NAME } from '@/lib/config';
import { useSchool } from '@/lib/school';
import { Button, Card, Icon, Input, Screen, Text, useTheme } from '@/ui';

export default function Login() {
  const t = useTheme();
  const router = useRouter();
  const { school } = useSchool();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please enter a valid mobile number.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestOtp({ phone: parsed.data });
      router.push({ pathname: '/login/otp', params: { phone: parsed.data, devCode: res.devCode ?? '' } });
    } catch (e) {
      setError(errorMessage(e, 'Couldn’t send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back footer={<Button title="Send OTP" icon="arrowRight" loading={busy} onPress={submit} />}>
      <Card gradient>
        <Icon name="lock" size={28} color={t.c.onBrand} />
        <Text variant="title" color={t.c.onBrand} style={{ marginTop: 12 }}>
          Log in to {school?.name ?? APP_NAME}
        </Text>
        <Text variant="body" color={t.c.onBrand} style={{ opacity: 0.85, marginTop: 4 }}>
          Students and instructors log in with their mobile number. We’ll text you a 6-digit code.
        </Text>
      </Card>
      <Input
        label="Mobile number"
        prefix="+91"
        placeholder="98765 43210"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={10}
        autoFocus
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
        error={error || undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Text variant="caption" faint>
        By continuing you agree to the Terms and Privacy Policy. Standard SMS rates may apply.
      </Text>
    </Screen>
  );
}
