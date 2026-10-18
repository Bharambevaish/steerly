import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './theme';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { haptic } from './haptics';

export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number; w?: DimensionValue; r?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: t.c.skeleton, opacity: v }, style]} />;
}

/** A few card-shaped skeletons for list screens. */
export function SkeletonList({ count = 3, h = 84 }: { count?: number; h?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} h={h} r={22} />
      ))}
    </View>
  );
}

export function EmptyState({
  icon = 'sparkle',
  title,
  body,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 12, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.brandSoft }}>
        <Icon name={icon} size={32} color={t.c.brand} />
      </View>
      <Text variant="h3" center>
        {title}
      </Text>
      {body ? (
        <Text variant="small" muted center>
          {body}
        </Text>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} size="md" full={false} variant="secondary" style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

export function Banner({ icon = 'alert', text, tone = 'warning' }: { icon?: IconName; text: string; tone?: 'warning' | 'info' | 'danger' }) {
  const t = useTheme();
  const color = tone === 'danger' ? t.c.danger : tone === 'info' ? t.c.info : t.c.warning;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: color + '1F' }}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="small" color={color} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

export function Stepper({ value, min = 0, max = 3, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  const t = useTheme();
  const btn = (icon: IconName, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'plus' ? 'Increase' : 'Decrease'}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onChange(next);
      }}
      style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surfaceAlt, opacity: disabled ? 0.4 : 1 }}
    >
      <Icon name={icon} size={16} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn('minus', value - 1, value <= min)}
      <Text variant="h3" style={{ minWidth: 16, textAlign: 'center' }}>
        {value}
      </Text>
      {btn('plus', value + 1, value >= max)}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
    >
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? t.c.danger + '1A' : t.c.surfaceAlt }}>
          <Icon name={icon} size={19} color={danger ? t.c.danger : t.c.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={danger ? t.c.danger : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={t.c.textFaint} /> : null)}
    </Pressable>
  );
}

export function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
      <Text variant="h3" style={{ flex: 1 }}>
        {children}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="caption" color={t.c.brand}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
