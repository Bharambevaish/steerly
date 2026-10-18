import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '@/lib/auth';
import { tabIcon, useTabScreenOptions } from '@/ui/tabs';

export default function StudentTabs() {
  const { user, claims, initializing } = useAuth();
  const options = useTabScreenOptions();
  if (!initializing && (!user || claims.role !== 'student' || !claims.studentId)) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={options}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="book" options={{ title: 'Book', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="lessons" options={{ title: 'Lessons', tabBarIcon: tabIcon('list') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: tabIcon('trending') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
