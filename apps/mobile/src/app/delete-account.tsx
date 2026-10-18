import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/callables';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { Banner, Button, Card, Icon, Input, Row, Screen, Text, useTheme, useToast } from '@/ui';

export default function DeleteAccount() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { signOut, role } = useAuth();
  const { school } = useSchool();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const schoolName = school?.name ?? 'your driving school';

  const run = async () => {
    if (confirm.trim() !== 'DELETE') return;
    setBusy(true);
    try {
      await api.deleteMyAccount({ confirm: 'DELETE' });
      await signOut().catch(() => {});
      qc.clear();
      toast.success('Your account has been deleted.');
      router.replace('/welcome');
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t delete your account. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const Item = ({ ok, text }: { ok: boolean; text: string }) => (
    <Row gap={10} style={{ alignItems: 'flex-start' }}>
      <Icon name={ok ? 'trash' : 'lock'} size={16} color={ok ? t.c.danger : t.c.textMuted} />
      <Text variant="small" style={{ flex: 1 }}>
        {text}
      </Text>
    </Row>
  );

  return (
    <Screen
      back
      title="Delete account"
      footer={<Button title="Permanently delete my account" variant="danger" icon="trash" loading={busy} disabled={confirm.trim() !== 'DELETE'} onPress={run} />}
    >
      <Banner tone="danger" text="This can’t be undone. You’ll be signed out on all devices." />
      <Card style={{ gap: 10 }}>
        <Text variant="h3">What we delete</Text>
        <Item ok text="Your login (phone number) and app profile" />
        <Item ok text="Your notifications inbox and push token" />
        {role === 'student' ? <Item ok text="Documents you uploaded that haven’t been verified yet" /> : null}
        {role === 'student' ? <Item ok text="Your contact details (email, address, date of birth)" /> : null}
      </Card>
      <Card style={{ gap: 10 }}>
        <Text variant="h3">What {schoolName} keeps</Text>
        <Item ok={false} text="Payment records and receipts (required by tax law)" />
        <Item ok={false} text="Lesson history and attendance, for licence and audit purposes" />
        <Item ok={false} text="Verified documents already filed with the school" />
        <Text variant="caption" muted>
          Contact {schoolName} directly to ask for these records to be removed.
        </Text>
      </Card>
      <View style={{ gap: 6 }}>
        <Input label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" />
      </View>
    </Screen>
  );
}
