import React, { useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { APP_NAME } from '@/lib/config';
import { useSchool } from '@/lib/school';
import { Button, Icon, Text, useTheme, type IconName } from '@/ui';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'car', title: 'Learn to drive,\nyour way.', body: 'Find the right course, see real prices and talk to your driving school in one tap.' },
  { icon: 'calendar', title: 'Book lessons\nin seconds.', body: 'Pick an open slot that fits your day. No calls, no waiting.' },
  { icon: 'trending', title: 'Watch yourself\nlevel up.', body: 'Track every skill from steering to highway driving, with notes from your instructor.' },
];

export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { setOnboarded, schoolId, locked } = useSchool();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);

  const finish = () => {
    setOnboarded();
    router.replace(schoolId || locked ? '/school' : '/pick-school');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <LinearGradient colors={[t.c.brandSoft, t.c.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 }}>
          <Text variant="h3">{APP_NAME}</Text>
          <Text variant="bodyStrong" muted onPress={finish} suppressHighlighting>
            Skip
          </Text>
        </View>
        <FlatList
          ref={list}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.title}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: 28, justifyContent: 'center', gap: 20 }}>
              <LinearGradient colors={t.c.gradient} style={{ width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={46} color={t.c.onBrand} />
              </LinearGradient>
              <Text variant="hero">{item.title}</Text>
              <Text variant="body" muted style={{ fontSize: 17, lineHeight: 25 }}>
                {item.body}
              </Text>
            </View>
          )}
        />
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 20 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={{ height: 8, width: i === index ? 28 : 8, borderRadius: 4, backgroundColor: i === index ? t.c.brand : t.c.border }} />
            ))}
          </View>
          <Button
            title={index < SLIDES.length - 1 ? 'Next' : 'Get started'}
            iconRight="arrowRight"
            onPress={() => {
              if (index < SLIDES.length - 1) {
                list.current?.scrollToIndex({ index: index + 1 });
                setIndex(index + 1);
              } else finish();
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
