import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Fire-and-forget; haptics are unavailable on web/simulators and must never throw into UI code.
const run = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  try {
    fn().catch(() => {});
  } catch {
    // module missing in this runtime
  }
};

export const haptic = {
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => run(() => Haptics.selectionAsync()),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warn: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
