import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { isAdminRole, ROLES, type Role } from '@steerly/shared';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  role: Role | null;
  /** schoolId claim (absent for superAdmin and users without a school). */
  claimSchoolId: string | null;
  studentId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  /** Force-refresh the ID token so new claims (after createSchool etc.) are picked up. */
  refreshClaims: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface Claims {
  role: Role | null;
  schoolId: string | null;
  studentId: string | null;
}

const NO_CLAIMS: Claims = { role: null, schoolId: null, studentId: null };

async function readClaims(user: User, force = false): Promise<Claims> {
  const token = await user.getIdTokenResult(force);
  const c = token.claims;
  return {
    role: typeof c.role === 'string' && (ROLES as readonly string[]).includes(c.role) ? (c.role as Role) : null,
    schoolId: typeof c.schoolId === 'string' ? c.schoolId : null,
    studentId: typeof c.studentId === 'string' ? c.studentId : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claims>(NO_CLAIMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged (not onAuthStateChanged) so a refreshed token with a new role is picked up.
    return onIdTokenChanged(auth, async (nextUser) => {
      setClaims(nextUser ? await readClaims(nextUser).catch(() => NO_CLAIMS) : NO_CLAIMS);
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setClaims(await readClaims(u, true));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      role: claims.role,
      claimSchoolId: claims.schoolId,
      studentId: claims.studentId,
      isAdmin: isAdminRole(claims.role),
      isSuperAdmin: claims.role === 'superAdmin',
      loading,
      refreshClaims,
      signOut: () => firebaseSignOut(auth),
    }),
    [user, claims, loading, refreshClaims],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
