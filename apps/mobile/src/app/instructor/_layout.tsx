import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '@/lib/auth';
import { tabIcon, useTabScreenOptions } from '@/ui/tabs';

export default function InstructorTabs() {
  const { user, claims, initializing } = useAuth();
  const options = useTabScreenOptions();
  if (!initializing && (!user || claims.role !== 'instructor' || !claims.schoolId)) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: tabIcon('zap') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: tabIcon('users') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
