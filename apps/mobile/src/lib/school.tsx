import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS, DEFAULT_SCHOOL_SETTINGS, type School, type SchoolCodeDoc, type SchoolSettings } from '@steerly/shared';
import { db } from './firebase';
import { useAuth } from './auth';
import { DEFAULT_SCHOOL_ID } from './config';

const SCHOOL_KEY = 'steerly.schoolId';
const ONBOARDED_KEY = 'steerly.onboarded';

interface SchoolState {
  /** Effective school: claim > white-label default > picked by the prospect. */
  schoolId: string | null;
  school: (Partial<School> & { id: string }) | null;
  settings: SchoolSettings;
  loading: boolean;
  /** True when the build is locked to one school. */
  locked: boolean;
  onboarded: boolean;
  setOnboarded: () => void;
  pickSchool: (schoolId: string | null) => Promise<void>;
  /** Resolve a 6-char join code via schoolCodes/{code}. */
  lookupCode: (code: string) => Promise<SchoolCodeDoc | null>;
}

const Ctx = createContext<SchoolState | null>(null);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const { claims } = useAuth();
  const [picked, setPicked] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [school, setSchool] = useState<SchoolState['school']>(null);
  const [schoolLoading, setSchoolLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getMany([SCHOOL_KEY, ONBOARDED_KEY])
      .then((map) => {
        setPicked(map[SCHOOL_KEY] || null);
        setOnboardedState(map[ONBOARDED_KEY] === '1');
      })
      .catch(() => {})
      .finally(() => setStorageReady(true));
  }, []);

  const schoolId = claims.schoolId ?? (DEFAULT_SCHOOL_ID || picked || null);

  useEffect(() => {
    if (!schoolId) {
      setSchool(null);
      return;
    }
    setSchoolLoading(true);
    return onSnapshot(
      doc(db, COLLECTIONS.schools, schoolId),
      (snap) => {
        setSchool(snap.exists() ? { ...(snap.data() as Partial<School>), id: snap.id } : null);
        setSchoolLoading(false);
      },
      () => setSchoolLoading(false),
    );
  }, [schoolId]);

  const pickSchool = useCallback(async (id: string | null) => {
    setPicked(id);
    try {
      if (id) await AsyncStorage.setItem(SCHOOL_KEY, id);
      else await AsyncStorage.removeItem(SCHOOL_KEY);
    } catch {
      // non-fatal
    }
  }, []);

  const setOnboarded = useCallback(() => {
    setOnboardedState(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  }, []);

  const lookupCode = useCallback(async (code: string) => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.schoolCodes, c));
    return snap.exists() ? (snap.data() as SchoolCodeDoc) : null;
  }, []);

  const value = useMemo<SchoolState>(
    () => ({
      schoolId,
      school,
      settings: { ...DEFAULT_SCHOOL_SETTINGS, ...(school?.settings ?? {}) },
      loading: !storageReady || (schoolLoading && !school),
      locked: !!DEFAULT_SCHOOL_ID,
      onboarded,
      setOnboarded,
      pickSchool,
      lookupCode,
    }),
    [schoolId, school, storageReady, schoolLoading, onboarded, setOnboarded, pickSchool, lookupCode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSchool(): SchoolState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSchool must be used inside SchoolProvider');
  return v;
}
