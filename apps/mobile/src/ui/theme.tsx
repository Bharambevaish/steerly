import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BRAND } from '@/lib/config';

export type ThemePref = 'system' | 'light' | 'dark';

const light = {
  bg: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EEE7',
  border: '#E8E2D8',
  text: '#16141A',
  textMuted: '#6E6A73',
  textFaint: '#A19DA6',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
  overlay: 'rgba(10,10,14,0.45)',
  skeleton: '#ECE7DF',
};

const dark: typeof light = {
  bg: '#0B0B10',
  surface: '#16161D',
  surfaceAlt: '#1F1F28',
  border: '#2A2A35',
  text: '#F5F3F0',
  textMuted: '#A8A4AE',
  textFaint: '#6D6975',
  success: '#22C55E',
  danger: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#23232D',
};

export type Palette = typeof light & {
  brand: string;
  brandSoft: string;
  onBrand: string;
  gradient: [string, string];
};

export interface Theme {
  dark: boolean;
  c: Palette;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  space: (n: number) => number;
  font: { display: string; displayMedium: string; body: string; bodyMedium: string; bodySemi: string; bodyBold: string };
}

function isHex(c: string | null | undefined): c is string {
  return !!c && /^#([0-9a-f]{6})$/i.test(c);
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(hex: string, with_: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(with_);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * amount).toString(16).padStart(2, '0');
  return `#${ch(a.r, b.r)}${ch(a.g, b.g)}${ch(a.b, b.b)}`;
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const FONTS = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

const PREF_KEY = 'steerly.themePref';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ brandColor, children }: { brandColor?: string | null; children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Theme>(() => {
    const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
    const base = isDark ? dark : light;
    const brand = isHex(brandColor) ? brandColor : DEFAULT_BRAND;
    const c: Palette = {
      ...base,
      brand,
      brandSoft: isDark ? mix(brand, '#0B0B10', 0.78) : mix(brand, '#FFFFFF', 0.85),
      onBrand: luminance(brand) > 0.6 ? '#16141A' : '#FFFFFF',
      gradient: [brand, mix(brand, isDark ? '#7C3AED' : '#F43F5E', 0.45)],
    };
    return {
      dark: isDark,
      c,
      pref,
      setPref: (p) => {
        setPrefState(p);
        AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
      },
      radius: { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 },
      space: (n) => n * 4,
      font: FONTS,
    };
  }, [pref, system, brandColor]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside ThemeProvider');
  return t;
}
