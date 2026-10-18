import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme';

export type TextVariant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'label' | 'number';

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
  faint?: boolean;
  center?: boolean;
  weight?: TextStyle['fontWeight'];
};

export function Text({ variant = 'body', color, muted, faint, center, style, ...rest }: Props) {
  const t = useTheme();
  const v: Record<TextVariant, TextStyle> = {
    hero: { fontFamily: t.font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
    title: { fontFamily: t.font.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
    h2: { fontFamily: t.font.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
    h3: { fontFamily: t.font.displayMedium, fontSize: 17, lineHeight: 22 },
    body: { fontFamily: t.font.body, fontSize: 15, lineHeight: 22 },
    bodyStrong: { fontFamily: t.font.bodySemi, fontSize: 15, lineHeight: 22 },
    small: { fontFamily: t.font.body, fontSize: 13, lineHeight: 18 },
    caption: { fontFamily: t.font.bodyMedium, fontSize: 12, lineHeight: 16 },
    label: { fontFamily: t.font.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
    number: { fontFamily: t.font.display, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  };
  const c = color ?? (faint ? t.c.textFaint : muted ? t.c.textMuted : t.c.text);
  return <RNText {...rest} style={[v[variant], { color: c }, center && { textAlign: 'center' }, style]} />;
}
