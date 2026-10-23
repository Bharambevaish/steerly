// Web auth: IndexedDB with a localStorage fallback, so a browser refresh keeps you signed in.
import type { FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';

export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
}
