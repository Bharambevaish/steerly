import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from './theme';
import { Text } from './Text';

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  label,
  sublabel,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const t = useTheme();
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.c.gradient[0]} />
            <Stop offset="1" stopColor={t.c.gradient[1]} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.c.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - v / 100)}
        />
      </Svg>
      <Text variant="number" style={{ fontSize: size * 0.24, lineHeight: size * 0.28 }}>
        {label ?? `${Math.round(v)}%`}
      </Text>
      {sublabel ? (
        <Text variant="caption" muted>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

/** Horizontal bar, 0-1. */
export function ProgressBar({ value, height = 8, color }: { value: number; height?: number; color?: string }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height, backgroundColor: color ?? t.c.brand }} />
    </View>
  );
}
