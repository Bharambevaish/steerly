import { initializeApp, getApp, getApps } from 'firebase/app';
// @ts-expect-error -- Firebase lists its web "types" before the react-native condition, so TS can't
// see this RN-only export. Metro resolves the RN build at runtime, where it exists.
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FUNCTIONS_REGION } from '@steerly/shared';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase config. Copy apps/mobile/.env.example to .env.local and fill it in.');
}

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Fast Refresh re-evaluates this module; initialize* may only run once per app instance.
export const auth: Auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db: Firestore = isFirstInit
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true })
  : getFirestore(app);

export const storage = getStorage(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);
export default app;
