import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { haptic } from './haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  disabled,
  size = 'lg',
  style,
  full = true,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const t = useTheme();
  const h = size === 'lg' ? 56 : size === 'md' ? 46 : 36;
  const fg =
    variant === 'primary'
      ? t.c.onBrand
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'secondary'
          ? t.c.text
          : variant === 'outline'
            ? t.c.text
            : t.c.brand;
  const bg =
    variant === 'secondary' ? t.c.surfaceAlt : variant === 'danger' ? t.c.danger : 'transparent';
  const inactive = disabled || loading;

  const content = (
    <View style={[styles.row, { height: h, paddingHorizontal: size === 'sm' ? 14 : 20 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'caption' : 'bodyStrong'} color={fg} style={{ fontSize: size === 'sm' ? 13 : 16 }}>
            {title}
          </Text>
          {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          borderRadius: size === 'sm' ? t.radius.pill : t.radius.lg,
          overflow: 'hidden',
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: full ? 'stretch' : 'flex-start',
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: t.c.border,
        },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={t.c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  bg,
  size = 40,
  label,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  bg?: string;
  size?: number;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg ?? t.c.surfaceAlt,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={size * 0.5} color={color ?? t.c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
