import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { Text } from './Text';
import { IconButton } from './Button';

/** Bottom sheet built on Modal (no extra native deps). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: t.c.overlay }} />
        <View
          style={{
            backgroundColor: t.c.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16),
            maxHeight: '88%',
          }}
        >
          <View style={{ alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: t.c.border, marginBottom: 8 }} />
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 }}>
              <Text variant="h2" style={{ flex: 1 }}>
                {title}
              </Text>
              <IconButton icon="x" label="Close" onPress={onClose} size={36} />
            </View>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
