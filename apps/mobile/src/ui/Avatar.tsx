import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './theme';
import { Text } from './Text';
import { initials } from '@/lib/format';

export function Avatar({ name, uri, size = 44 }: { name?: string | null; uri?: string | null; size?: number }) {
  const t = useTheme();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.c.surfaceAlt }} contentFit="cover" />;
  }
  return (
    <LinearGradient colors={t.c.gradient} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View>
        <Text variant="h3" color={t.c.onBrand} style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
          {initials(name)}
        </Text>
      </View>
    </LinearGradient>
  );
}
