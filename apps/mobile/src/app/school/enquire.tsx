import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { COURSES, PREFERRED_TIMES, enquiryInputSchema, schoolCol, type EnquiryInput } from '@steerly/shared';
import type { z } from 'zod';
import { db } from '@/lib/firebase';
import { useSchool } from '@/lib/school';
import { useCourses } from '@/lib/data';
import { errorMessage } from '@/lib/callables';
import { Button, Chip, Input, Row, Screen, Text, useTheme, useToast } from '@/ui';

type FormIn = z.input<typeof enquiryInputSchema>;

export default function Enquire() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { schoolId, school } = useSchool();
  const courses = useCourses(schoolId);

  const options = useMemo(
    () =>
      courses.data.length
        ? courses.data.map((c) => ({ id: c.id as string | null, name: c.name ?? 'Course' }))
        : COURSES.map((name) => ({ id: null as string | null, name })),
    [courses.data],
  );

  const preselected = courses.data.find((c) => c.id === params.courseId);
  const { control, handleSubmit, setValue, watch, formState } = useForm<FormIn, unknown, EnquiryInput>({
    resolver: zodResolver(enquiryInputSchema),
    defaultValues: {
      name: '',
      phone: '',
      courseId: preselected?.id ?? null,
      courseName: preselected?.name ?? '',
      preferredTime: undefined,
      source: 'app',
    },
  });
  const courseName = watch('courseName');
  const preferredTime = watch('preferredTime');

  const onSubmit = async (data: EnquiryInput) => {
    if (!schoolId) return;
    try {
      // Shape must satisfy validNewEnquiry() in firestore.rules.
      await addDoc(collection(db, schoolCol(schoolId, 'enquiries')), {
        name: data.name,
        phone: data.phone,
        courseId: data.courseId ?? null,
        courseName: data.courseName,
        preferredTime: data.preferredTime,
        source: 'app',
        status: 'New',
        notes: '',
        followUpAt: null,
        studentId: null,
        createdAt: serverTimestamp(),
        updatedAt: null,
      });
      router.replace({ pathname: '/school/enquiry-success', params: { name: data.name.split(' ')[0] } });
    } catch (e) {
      toast.error(errorMessage(e, 'Couldn’t send your enquiry. Check your internet and try again.'));
    }
  };

  return (
    <Screen
      back
      title="Send an enquiry"
      subtitle={school?.name ? `${school.name} will call you back` : undefined}
      footer={<Button title="Send enquiry" icon="arrowRight" loading={formState.isSubmitting} onPress={handleSubmit(onSubmit)} />}
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input label="Full name" icon="user" placeholder="Your name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} autoComplete="name" />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input
            label="Mobile number"
            prefix="+91"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={field.value}
            onChangeText={(v) => field.onChange(v.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="tel"
          />
        )}
      />
      <View style={{ gap: 8 }}>
        <Text variant="caption" muted>
          Course
        </Text>
        <Row wrap gap={8}>
          {options.map((o) => (
            <Chip
              key={`${o.id}-${o.name}`}
              label={o.name}
              selected={courseName === o.name}
              onPress={() => {
                setValue('courseName', o.name, { shouldValidate: true });
                setValue('courseId', o.id);
              }}
            />
          ))}
        </Row>
        {formState.errors.courseName ? (
          <Text variant="caption" color={t.c.danger}>
            {formState.errors.courseName.message}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="caption" muted>
          Preferred time
        </Text>
        <Row wrap gap={8}>
          {PREFERRED_TIMES.map((p) => (
            <Chip key={p} label={p} selected={preferredTime === p} onPress={() => setValue('preferredTime', p, { shouldValidate: true })} />
          ))}
        </Row>
        {formState.errors.preferredTime ? (
          <Text variant="caption" color={t.c.danger}>
            {formState.errors.preferredTime.message}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
