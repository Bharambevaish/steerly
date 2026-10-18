import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme';
import { haptic } from './haptics';

export function Card({
  children,
  style,
  onPress,
  gradient,
  padded = true,
  tone,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Brand gradient background (hero cards). */
  gradient?: boolean;
  padded?: boolean;
  /** Soft tinted background. */
  tone?: 'brand' | 'alt';
}) {
  const t = useTheme();
  const base: ViewStyle = {
    borderRadius: t.radius.xl,
    padding: padded ? 18 : 0,
    backgroundColor: tone === 'brand' ? t.c.brandSoft : tone === 'alt' ? t.c.surfaceAlt : t.c.surface,
    borderWidth: gradient || tone ? 0 : 1,
    borderColor: t.c.border,
    overflow: 'hidden',
  };
  const inner = gradient ? (
    <LinearGradient
      colors={t.c.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ padding: padded ? 20 : 0, borderRadius: t.radius.xl }}
    >
      {children}
    </LinearGradient>
  ) : (
    children
  );
  const st = [base, gradient && { padding: 0 }, style];
  if (!onPress) return <View style={st}>{inner}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [...st, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      {inner}
    </Pressable>
  );
}

export function Row({ children, gap = 12, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Spacer({ h = 12 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.c.border, marginVertical: 12 }} />;
}
