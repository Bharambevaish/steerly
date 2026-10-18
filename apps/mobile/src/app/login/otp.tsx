import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, errorMessage } from '@/lib/callables';
import { useAuth } from '@/lib/auth';
import { Banner, Button, Screen, Text, haptic, useTheme, useToast } from '@/ui';

const RESEND_SECONDS = 30;

export default function Otp() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { signInWithToken } = useAuth();
  const params = useLocalSearchParams<{ phone: string; devCode?: string }>();
  const phone = String(params.phone ?? '');
  const [devCode, setDevCode] = useState(params.devCode || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_SECONDS);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const verify = async (value = code) => {
    if (busy) return;
    if (!/^\d{6}$/.test(value)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { token } = await api.verifyOtp({ phone, code: value });
      await signInWithToken(token);
      haptic.success();
      try {
        router.dismissAll();
      } catch {
        // nothing to dismiss
      }
      router.replace('/');
    } catch (e) {
      haptic.error();
      setError(errorMessage(e, 'That code didn’t work. Try again.'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const res = await api.requestOtp({ phone });
      setDevCode(res.devCode ?? '');
      setLeft(RESEND_SECONDS);
      toast.success('New code sent');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen back footer={<Button title="Verify & continue" loading={busy} onPress={() => verify()} />}>
      <View style={{ gap: 6, marginTop: 8 }}>
        <Text variant="title">Enter the code</Text>
        <Text variant="body" muted>
          Sent to +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
        </Text>
      </View>
      {devCode ? <Banner icon="zap" tone="info" text={`Dev mode: your code is ${devCode}`} /> : null}
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        {Array.from({ length: 6 }, (_, i) => {
          const ch = code[i] ?? '';
          const active = i === Math.min(code.length, 5);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 62,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.c.surfaceAlt,
                borderWidth: 2,
                borderColor: error ? t.c.danger : active ? t.c.brand : 'transparent',
              }}
            >
              <Text variant="h2">{ch}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          if (digits.length === 6) verify(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
      {error ? (
        <Text variant="small" color={t.c.danger}>
          {error}
        </Text>
      ) : null}
      <View style={{ alignItems: 'center' }}>
        {left > 0 ? (
          <Text variant="small" muted>
            Resend code in 0:{String(left).padStart(2, '0')}
          </Text>
        ) : (
          <Text variant="bodyStrong" color={t.c.brand} onPress={resend} suppressHighlighting>
            Resend code
          </Text>
        )}
      </View>
    </Screen>
  );
}
