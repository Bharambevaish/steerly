import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onIdTokenChanged, signInWithCustomToken, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, schoolCol, type Member, type Role, type SteerlyClaims, type UserDoc } from '@steerly/shared';
import { auth, db } from './firebase';

interface AuthState {
  user: User | null;
  claims: SteerlyClaims;
  /** users/{uid} (may be missing for brand-new users). */
  profile: Partial<UserDoc> | null;
  initializing: boolean;
  role: Role | null;
  /** Owner/staff who also give lessons (members/{uid}.teaches). Always true for instructors. */
  teaches: boolean;
  /** True while we still need members/{uid} to decide `teaches` (owner/staff only). */
  teachesLoading: boolean;
  /** Can use the instructor tabs: instructors, plus owners/staff with teaches === true. */
  canTeach: boolean;
  signInWithToken: (token: string) => Promise<SteerlyClaims>;
  /** Force-refresh the ID token so new custom claims (after joinSchool etc.) are visible. */
  refreshClaims: () => Promise<SteerlyClaims>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

function pickClaims(raw: Record<string, unknown>): SteerlyClaims {
  const c: SteerlyClaims = {};
  if (typeof raw.role === 'string') c.role = raw.role as Role;
  if (typeof raw.schoolId === 'string' && raw.schoolId) c.schoolId = raw.schoolId;
  if (typeof raw.studentId === 'string' && raw.studentId) c.studentId = raw.studentId;
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [claims, setClaims] = useState<SteerlyClaims>({});
  const [profile, setProfile] = useState<Partial<UserDoc> | null>(null);
  const [initializing, setInitializing] = useState(true);
  // members/{uid}.teaches for owner/staff, tagged with the member path it was read from.
  const [member, setMember] = useState<{ key: string; teaches: boolean } | null>(null);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (u) => {
        setUser(u);
        if (!u) {
          setClaims({});
          setInitializing(false);
          return;
        }
        try {
          const res = await u.getIdTokenResult();
          setClaims(pickClaims(res.claims));
        } catch {
          // offline on cold start: keep previous claims; the token refreshes when back online
        }
        setInitializing(false);
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    return onSnapshot(
      doc(db, COLLECTIONS.users, user.uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as Partial<UserDoc>) : null),
      () => setProfile(null),
    );
  }, [user]);

  const needsMember = !!user && !!claims.schoolId && (claims.role === 'owner' || claims.role === 'staff');
  const memberKey = needsMember && user && claims.schoolId ? `${schoolCol(claims.schoolId, 'members')}/${user.uid}` : null;
  useEffect(() => {
    if (!memberKey) return;
    return onSnapshot(
      doc(db, memberKey),
      (snap) => setMember({ key: memberKey, teaches: snap.exists() && (snap.data() as Partial<Member>).teaches === true }),
      () => setMember({ key: memberKey, teaches: false }),
    );
  }, [memberKey]);
  const memberTeaches = memberKey && member?.key === memberKey ? member.teaches : undefined;

  const refreshClaims = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return {};
    await u.getIdToken(true);
    const res = await u.getIdTokenResult();
    const c = pickClaims(res.claims);
    setClaims(c);
    return c;
  }, []);

  const signInWithToken = useCallback(
    async (token: string) => {
      await signInWithCustomToken(auth, token);
      return refreshClaims();
    },
    [refreshClaims],
  );

  const signOut = useCallback(async () => {
    const u = auth.currentUser;
    if (u) {
      // Stop pushes to this device; ignore failures (offline / missing doc).
      await updateDoc(doc(db, COLLECTIONS.users, u.uid), { expoPushToken: null }).catch(() => {});
    }
    await fbSignOut(auth);
  }, []);

  const teaches = claims.role === 'instructor' || memberTeaches === true;
  const teachesLoading = !!memberKey && memberTeaches === undefined;
  const value = useMemo<AuthState>(
    () => ({
      user,
      claims,
      profile,
      initializing,
      role: claims.role ?? null,
      teaches,
      teachesLoading,
      canTeach: teaches && !!claims.schoolId,
      signInWithToken,
      refreshClaims,
      signOut,
    }),
    [user, claims, profile, initializing, teaches, teachesLoading, signInWithToken, refreshClaims, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
