import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from './theme';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { haptic } from './haptics';

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const t = useTheme();
  const fg = selected ? t.c.onBrand : t.c.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      disabled={!onPress}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: t.radius.pill,
        backgroundColor: selected ? t.c.brand : t.c.surfaceAlt,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : selected ? <Icon name="check" size={14} color={fg} /> : null}
      <Text variant="caption" color={fg} style={{ fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

type Tone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning' | 'info';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = useTheme();
  const color =
    tone === 'brand'
      ? t.c.brand
      : tone === 'success'
        ? t.c.success
        : tone === 'danger'
          ? t.c.danger
          : tone === 'warning'
            ? t.c.warning
            : tone === 'info'
              ? t.c.info
              : t.c.textMuted;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill, backgroundColor: color + '22' }}>
      <Text variant="caption" color={color} style={{ fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}
