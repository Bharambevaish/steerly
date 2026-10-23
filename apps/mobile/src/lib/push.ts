import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@steerly/shared';
import { db } from './firebase';
import { EAS_PROJECT_ID } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Ask for permission, get an Expo push token and save it to users/{uid}.expoPushToken.
 * Silently skips on simulators, Expo Go (remote push unsupported since SDK 53) and when no EAS projectId is configured.
 */
export async function registerForPush(uid: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice || isExpoGo || !EAS_PROJECT_ID) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Lessons & payments',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#F59E0B',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    await updateDoc(doc(db, COLLECTIONS.users, uid), { expoPushToken: token });
    return token;
  } catch (e) {
    if (__DEV__) console.warn('[push] registration skipped:', e);
    return null;
  }
}

export function linkFromNotification(n: Notifications.Notification | null | undefined): string | null {
  const link = n?.request.content.data?.link;
  return typeof link === 'string' && link ? link : null;
}

/** The last notification the user tapped (default action only), as { id, link }. */
export function useTappedNotification(): { id: string; link: string | null } | null {
  const response = Notifications.useLastNotificationResponse();
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  return { id: response.notification.request.identifier, link: linkFromNotification(response.notification) };
}
