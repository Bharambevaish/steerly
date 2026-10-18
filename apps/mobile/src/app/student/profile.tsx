import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { schoolCol } from '@steerly/shared';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { useMyStudent } from '@/lib/data';
import { errorMessage } from '@/lib/callables';
import { formatINR } from '@/lib/format';
import { Avatar, Button, Card, Input, ListRow, Row, Screen, SectionTitle, Sheet, Skeleton, Text, useTheme, useToast } from '@/ui';
import { SettingsSection } from '@/ui/SettingsSection';

const editSchema = z.object({
  email: z.union([z.literal(''), z.email('Enter a valid email.')]),
  address: z.string().trim().max(200, 'Address is too long.'),
  dob: z.union([z.literal(''), z.iso.date('Use the format YYYY-MM-DD.')]),
});

export default function StudentProfile() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { claims, profile } = useAuth();
  const { school } = useSchool();
  const student = useMyStudent();
  const s = student.data;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: '', address: '', dob: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [busy, setBusy] = useState(false);

  const openEdit = () => {
    setForm({ email: s?.email ?? '', address: s?.address ?? '', dob: s?.dob ?? '' });
    setErrors({});
    setEditing(true);
  };

  const save = async () => {
    const parsed = editSchema.safeParse({ ...form, email: form.email.trim(), dob: form.dob.trim() });
    if (!parsed.success) {
      const e: typeof errors = {};
      for (const i of parsed.error.issues) e[i.path[0] as keyof typeof form] = i.message;
      setErrors(e);
      return;
    }
    if (!claims.schoolId || !claims.studentId) return;
    setBusy(true);
    try {
      // Rules: students may change only email, address and dob.
      await updateDoc(doc(db, schoolCol(claims.schoolId, 'students'), claims.studentId), {
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        dob: parsed.data.dob || null,
      });
      toast.success('Profile updated');
      setEditing(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const due = Math.max(0, (s?.feeTotal ?? 0) - (s?.feePaid ?? 0));

  return (
    <Screen title="Profile" onRefresh={() => student.refetch()}>
      {student.loading ? (
        <Skeleton h={120} r={24} />
      ) : (
        <Card>
          <Row gap={14}>
            <Avatar name={s?.name ?? profile?.name} size={60} />
            <View style={{ flex: 1 }}>
              <Text variant="h2" numberOfLines={1}>
                {s?.name ?? profile?.name ?? 'Student'}
              </Text>
              <Text variant="small" muted>
                +91 {s?.phone ?? profile?.phone?.slice(-10) ?? ''}
              </Text>
              <Text variant="small" muted numberOfLines={1}>
                {s?.courseName ?? ''}
                {school?.name ? ` · ${school.name}` : ''}
              </Text>
            </View>
          </Row>
          <View style={{ marginTop: 14, gap: 6 }}>
            <Detail label="Email" value={s?.email} />
            <Detail label="Address" value={s?.address} />
            <Detail label="Date of birth" value={s?.dob} />
            <Detail label="Instructor" value={s?.instructorName} />
          </View>
          <Button title="Edit details" size="sm" variant="secondary" full={false} icon="edit" onPress={openEdit} style={{ marginTop: 14 }} />
        </Card>
      )}

      <SectionTitle>My stuff</SectionTitle>
      <Card style={{ paddingVertical: 6 }}>
        <ListRow icon="file" title="Documents" subtitle="ID, address proof, photo, licences" onPress={() => router.push('/documents')} />
        <ListRow icon="receipt" title="Payments & receipts" subtitle={due > 0 ? `${formatINR(due)} due` : 'All paid up'} onPress={() => router.push('/payments')} />
      </Card>

      <SettingsSection />

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title="Edit details"
        footer={<Button title="Save" loading={busy} onPress={save} />}
      >
        <Text variant="small" muted>
          Your name, phone and course are managed by {school?.name ?? 'your school'}.
        </Text>
        <Input label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <Input label="Address" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} multiline maxLength={200} error={errors.address} />
        <Input
          label="Date of birth"
          value={form.dob}
          onChangeText={(v) => setForm((f) => ({ ...f, dob: v.replace(/[^\d-]/g, '').slice(0, 10) }))}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          error={errors.dob}
        />
      </Sheet>
    </Screen>
  );

  function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
      <Row>
        <Text variant="small" muted style={{ width: 110 }}>
          {label}
        </Text>
        <Text variant="small" style={{ flex: 1 }} color={value ? t.c.text : t.c.textFaint} numberOfLines={2}>
          {value || 'Not added'}
        </Text>
      </Row>
    );
  }
}
