import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from './theme';
import { Text } from './Text';
import { IconButton } from './Button';
import { haptic } from './haptics';

export function Screen({
  children,
  title,
  subtitle,
  right,
  back,
  onRefresh,
  scroll = true,
  edges = ['top'],
  contentStyle,
  footer,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Show a back button in the header. */
  back?: boolean;
  /** Enables pull-to-refresh. */
  onRefresh?: () => Promise<unknown> | void;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Sticky footer (e.g. a primary button). */
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = useCallback(async () => {
    if (!onRefresh) return;
    haptic.tap();
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // errors are surfaced by the caller's own UI
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const header =
    title || back || right ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        {back ? <IconButton icon="chevronLeft" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
        <View style={{ flex: 1 }}>
          {title ? <Text variant={back ? 'h2' : 'title'}>{title}</Text> : null}
          {subtitle ? (
            <Text variant="small" muted>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    ) : null;

  const pad: ViewStyle = { paddingHorizontal: 20, paddingBottom: 32, gap: 16 };

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[pad, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={t.c.brand} colors={[t.c.brand]} /> : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 10 }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
