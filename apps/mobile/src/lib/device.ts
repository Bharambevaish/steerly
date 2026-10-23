// Small cross-platform wrappers for things that behave differently on web.
import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/** Indian mobile (10 digits or +91…) → tel: link. Desktop browsers without a dialer just ignore it. */
export async function callPhone(phone: string | null | undefined): Promise<void> {
  const digits = (phone ?? '').replace(/[^\d+]/g, '');
  if (!digits) return;
  const e164 = digits.startsWith('+') ? digits : `+91${digits.slice(-10)}`;
  try {
    await Linking.openURL(`tel:${e164}`);
  } catch {
    // no dialer (tablet / desktop browser)
  }
}

/** Open an https URL: in-app browser on native, a new tab on web. Never throws. */
export async function openUrl(url: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Popup blockers reject window.open after an await; fall back to same-tab navigation.
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.assign(url);
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}

/** Yes/no confirm. Alert.alert with buttons is a no-op on react-native-web, so use window.confirm there. */
export function confirmAsync(title: string, message: string, confirmText = 'OK', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
