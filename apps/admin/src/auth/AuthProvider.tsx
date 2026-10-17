import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { isAdminRole, type Role } from '@steerly/shared';
import { auth } from '../firebase';

interface AuthState {
  user: User | null;
  role: Role | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged (not onAuthStateChanged) so a refreshed token with a new role is picked up.
    return onIdTokenChanged(auth, async (nextUser) => {
      if (nextUser) {
        const token = await nextUser.getIdTokenResult();
        const claim = token.claims.role;
        setRole(typeof claim === 'string' ? (claim as Role) : null);
      } else {
        setRole(null);
      }
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    role,
    isAdmin: isAdminRole(role),
    loading,
    signOut: () => firebaseSignOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
