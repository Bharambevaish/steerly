import { HttpsError, onCall, type CallableOptions, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import type { z } from 'zod';
import { ROLES, type Role, type SteerlyClaims } from '@steerly/shared';
import { ENFORCE_APP_CHECK } from './params';
import { securityEvent } from './securityLog';

export interface Caller {
  uid: string;
  claims: SteerlyClaims;
  role: Role | null;
  isSuperAdmin: boolean;
  phone: string | null; // E.164 from the ID token
  email: string | null;
}

/** Validates `data` with a shared zod schema; throws invalid-argument with the first issue. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.join('.');
  const message = issue?.message ?? 'Invalid request.';
  throw new HttpsError('invalid-argument', path ? `${path}: ${message}` : message);
}

export function requireAuth(request: CallableRequest<unknown>): Caller {
  const a = request.auth;
  if (!a) throw new HttpsError('unauthenticated', 'Please sign in to continue.');
  const t = a.token;
  const role = typeof t.role === 'string' && (ROLES as readonly string[]).includes(t.role) ? (t.role as Role) : null;
  const claims: SteerlyClaims = {
    role: role ?? undefined,
    schoolId: typeof t.schoolId === 'string' ? t.schoolId : undefined,
    studentId: typeof t.studentId === 'string' ? t.studentId : undefined,
  };
  return {
    uid: a.uid,
    claims,
    role,
    isSuperAdmin: role === 'superAdmin',
    phone: typeof t.phone_number === 'string' ? t.phone_number : null,
    email: typeof t.email === 'string' ? t.email : null,
  };
}

/** Caller must belong to `schoolId` with one of `roles`. Super admins always pass. */
export function assertRole(request: CallableRequest<unknown>, schoolId: string, roles: readonly Role[]): Caller {
  const caller = requireAuth(request);
  if (caller.isSuperAdmin) return caller;
  if (caller.claims.schoolId !== schoolId || !caller.role || !roles.includes(caller.role)) {
    securityEvent('permission_denied', { uid: caller.uid, role: caller.role, callerSchoolId: caller.claims.schoolId ?? null, schoolId, needed: roles });
    throw new HttpsError('permission-denied', "You don't have permission to do that.");
  }
  return caller;
}

export const ADMIN: readonly Role[] = ['owner', 'staff'];
export const OWNER: readonly Role[] = ['owner'];

/** onCall with schema validation and uniform error handling. Non-HttpsErrors are logged and hidden. */
export function callable<S extends z.ZodType, O>(
  schema: S,
  handler: (data: z.output<S>, request: CallableRequest<unknown>) => Promise<O>,
  opts: CallableOptions = {},
) {
  // App Check is enforced on every callable once ENFORCE_APP_CHECK=true (default off: see docs/SECURITY_REVIEW.md H2).
  return onCall<unknown, Promise<O>>({ enforceAppCheck: ENFORCE_APP_CHECK, ...opts }, async (request) => {
    const data = parse(schema, request.data);
    try {
      return await handler(data, request);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('Unhandled error in callable', err);
      throw new HttpsError('internal', 'Something went wrong. Please try again.');
    }
  });
}

export const fail = (code: ConstructorParameters<typeof HttpsError>[0], message: string, details?: unknown): never => {
  throw new HttpsError(code, message, details);
};
