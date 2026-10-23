// Only imported by the lazily-loaded public school page, so the marketing pages never ship Firebase.
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!firebaseConfigured) {
  console.error('Missing Firebase config. Copy apps/web/.env.example to .env.local and fill it in.');
}

const app = initializeApp(
  firebaseConfigured ? firebaseConfig : { projectId: 'unconfigured', apiKey: 'unconfigured' },
);

// App Check blocks requests that don't come from this site (spam protection for the enquiry form).
const siteKey = env.VITE_APPCHECK_RECAPTCHA_SITE_KEY;
if (firebaseConfigured && siteKey) {
  void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
  });
}

export const db = getFirestore(app);

// Local development against `npm run emulators` (see .env.emulator / `npm run dev:emulator`).
if (env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export default app;
