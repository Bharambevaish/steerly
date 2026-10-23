import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { FUNCTIONS_REGION } from '@steerly/shared';

// Imported (directly or indirectly) by every function module, so this runs before any trigger is defined.
setGlobalOptions({ region: FUNCTIONS_REGION, maxInstances: 20 });

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
export const bucket = () => getStorage().bucket();
