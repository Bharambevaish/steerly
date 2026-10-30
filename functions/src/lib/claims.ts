import { securityEvent } from './securityLog';
import type { SteerlyClaims, UserDoc } from '@steerly/shared';
import { auth } from './admin';
import { userRef } from './data';

/** Sets custom claims and mirrors role/schoolId/studentId into users/{uid}. `{}` removes all access. */
export async function setClaims(uid: string, claims: SteerlyClaims): Promise<void> {
  securityEvent('claims_changed', { uid, role: claims.role ?? null, schoolId: claims.schoolId ?? null, studentId: claims.studentId ?? null });
  const clean: SteerlyClaims = {};
  if (claims.role) clean.role = claims.role;
  if (claims.schoolId) clean.schoolId = claims.schoolId;
  if (claims.studentId) clean.studentId = claims.studentId;
  await auth.setCustomUserClaims(uid, { ...clean });
  const mirror: Pick<UserDoc, 'role' | 'schoolId' | 'studentId'> = {
    role: clean.role ?? null,
    schoolId: clean.schoolId ?? null,
    studentId: clean.studentId ?? null,
  };
  await userRef(uid).set(mirror, { merge: true });
}
