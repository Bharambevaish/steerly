// Native (Android/iOS) auth: persist the session in AsyncStorage. The web build uses authInit.web.ts.
import type { FirebaseApp } from 'firebase/app';
// @ts-expect-error -- Firebase lists its web "types" before the react-native condition, so TS can't
// see this RN-only export. Metro resolves the RN build at runtime, where it exists.
import { initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
