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
  const { user, claims, initializing, canTeach, teachesLoading } = useAuth();
  const { schoolId, onboarded, loading, locked } = useSchool();

  if (initializing || loading || (user && teachesLoading)) {
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

  // Instructors, and owners/staff flagged "also teaches", get the instructor tabs.
  if (canTeach) return <Redirect href="/instructor/today" />;
  if (isAdminRole(claims.role)) return <Redirect href="/admin-web" />;
  if (claims.role === 'student' && claims.schoolId && claims.studentId) return <Redirect href="/student/home" />;
  return <Redirect href="/join" />;
}
