import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import * as Device from 'expo-device';
import { FUNCTIONS_REGION } from '@steerly/shared';
import { createAuth } from './authInit';

/** Point every SDK at the local Firebase emulators (see .env.emulator.example). */
export const USE_EMULATORS = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || (USE_EMULATORS ? 'demo-key' : undefined),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || (USE_EMULATORS ? 'demo-steerly' : undefined),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || (USE_EMULATORS ? 'demo-steerly.appspot.com' : undefined),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase config. Copy apps/mobile/.env.example to .env.local and fill it in.');
}

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Fast Refresh re-evaluates this module; initialize* may only run once per app instance.
export const auth: Auth = isFirstInit ? createAuth(app) : getAuth(app);

export const db: Firestore = isFirstInit
  ? initializeFirestore(app, Platform.OS === 'web' ? {} : { experimentalAutoDetectLongPolling: true })
  : getFirestore(app);

export const storage = getStorage(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);

/**
 * Emulator host. EXPO_PUBLIC_EMULATOR_HOST wins (e.g. your PC's LAN IP for a physical phone);
 * otherwise 10.0.2.2 on the Android emulator (its alias for the host machine) and 127.0.0.1 elsewhere.
 */
function emulatorHost(): string {
  const explicit = process.env.EXPO_PUBLIC_EMULATOR_HOST?.trim();
  if (explicit) return explicit;
  if (Platform.OS === 'android' && !Device.isDevice) return '10.0.2.2';
  return '127.0.0.1';
}

if (USE_EMULATORS && isFirstInit) {
  const host = emulatorHost();
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
  if (__DEV__) console.log(`[firebase] using emulators on ${host}`);
}

export default app;
