import React from 'react';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

/** Shared bottom-tab look for student and instructor modes. */
export function useTabScreenOptions() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: t.c.brand,
    tabBarInactiveTintColor: t.c.textFaint,
    tabBarStyle: {
      backgroundColor: t.c.surface,
      borderTopColor: t.c.border,
      height: 62 + insets.bottom,
      paddingTop: 6,
      paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
    },
    tabBarLabelStyle: { fontFamily: t.font.bodySemi, fontSize: 11 },
    sceneStyle: { backgroundColor: t.c.bg },
  } as const;
}

export const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={name} size={22} color={String(color)} strokeWidth={focused ? 2.4 : 2} />;
