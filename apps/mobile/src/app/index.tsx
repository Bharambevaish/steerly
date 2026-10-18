import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { isAdminRole } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { useSchool } from '@/lib/school';
import { useTheme } from '@/ui';

/** Entry gate: routes to the right experience from auth state + claims. */
export default function Index() {
  const t = useTheme();
  const { user, claims, initializing } = useAuth();
  const { schoolId, onboarded, loading, locked } = useSchool();

  if (initializing || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.bg }}>
        <ActivityIndicator color={t.c.brand} size="large" />
      </View>
    );
  }

  if (!user) {
    if (!onboarded) return <Redirect href="/welcome" />;
    if (!schoolId && !locked) return <Redirect href="/pick-school" />;
    return <Redirect href="/school" />;
  }

  if (isAdminRole(claims.role)) return <Redirect href="/admin-web" />;
  if (claims.role === 'instructor' && claims.schoolId) return <Redirect href="/instructor/today" />;
  if (claims.role === 'student' && claims.schoolId && claims.studentId) return <Redirect href="/student/home" />;
  return <Redirect href="/join" />;
}
