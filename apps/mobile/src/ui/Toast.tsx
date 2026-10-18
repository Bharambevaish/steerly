import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { Text } from './Text';
import { Icon } from './Icon';
import { haptic } from './haptics';
import { errorMessage } from '@/lib/callables';

type Kind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  show: (message: string, kind?: Kind) => void;
  success: (message: string) => void;
  error: (errOrMessage: unknown) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const seq = useRef(0);
  const show = useCallback((message: string, kind: Kind = 'info') => {
    seq.current += 1;
    if (kind === 'error') haptic.error();
    else if (kind === 'success') haptic.success();
    setItem({ id: seq.current, kind, message });
  }, []);
  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (e) => show(typeof e === 'string' ? e : errorMessage(e), 'error'),
    }),
    [show],
  );
  return (
    <Ctx.Provider value={api}>
      {children}
      {item ? <ToastView key={item.id} item={item} onDone={() => setItem(null)} /> : null}
    </Ctx.Provider>
  );
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
    }, item.kind === 'error' ? 4500 : 2800);
    return () => clearTimeout(timer);
  }, [anim, item, onDone]);
  const color = item.kind === 'success' ? t.c.success : item.kind === 'error' ? t.c.danger : t.c.info;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: insets.top + 8,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <Pressable onPress={onDone} accessibilityRole="alert">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            borderRadius: 18,
            backgroundColor: t.dark ? '#24242E' : '#16141A',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Icon name={item.kind === 'success' ? 'checkCircle' : item.kind === 'error' ? 'alert' : 'bell'} size={20} color={color} />
          <Text variant="small" color="#FFFFFF" style={{ flex: 1 }}>
            {item.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const t = useContext(Ctx);
  if (!t) throw new Error('useToast must be used inside ToastProvider');
  return t;
}
