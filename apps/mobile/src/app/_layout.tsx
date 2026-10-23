import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SchoolProvider, useSchool } from '@/lib/school';
import { useOnline } from '@/lib/network';
import { registerForPush, useTappedNotification } from '@/lib/push';
import { resolveLink } from '@/lib/links';
import { Banner, ThemeProvider, ToastProvider, useTheme } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // If fonts fail we still render with system fonts rather than block the app.
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SchoolProvider>
            <Themed />
          </SchoolProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function Themed() {
  const { school } = useSchool();
  return (
    <ThemeProvider brandColor={school?.brandColor}>
      <ToastProvider>
        <AppStack />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppStack() {
  const t = useTheme();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const { user, role, canTeach } = useAuth();
  usePush(user?.uid ?? null, role, canTeach);

  const navTheme = t.dark ? DarkTheme : DefaultTheme;
  return (
    <NavThemeProvider
      value={{ ...navTheme, colors: { ...navTheme.colors, background: t.c.bg, card: t.c.surface, primary: t.c.brand, text: t.c.text, border: t.c.border } }}
    >
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="student" options={{ animation: 'fade' }} />
        <Stack.Screen name="instructor" options={{ animation: 'fade' }} />
      </Stack>
      {!online ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72 }}>
          <Banner icon="wifiOff" tone="danger" text="You’re offline. Showing saved data; changes sync when you reconnect." />
        </View>
      ) : null}
    </NavThemeProvider>
  );
}

/** Register the device for push after login and route notification taps by data.link. */
function usePush(uid: string | null, role: ReturnType<typeof useAuth>['role'], canTeach: boolean) {
  const router = useRouter();
  const tapped = useTappedNotification();
  const tapId = tapped?.id ?? null;
  const tapLink = tapped?.link ?? null;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (uid) registerForPush(uid).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid || !role || !tapId || handled.current === tapId) return;
    // Let the index redirect settle before pushing on top of it.
    const timer = setTimeout(() => {
      handled.current = tapId;
      router.push(resolveLink(tapLink, role, canTeach));
    }, 300);
    return () => clearTimeout(timer);
  }, [uid, role, canTeach, tapId, tapLink, router]);
}
