import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { COLLECTIONS, schoolCol, type Branch, type Course, type Member, type School } from '@steerly/shared';
import { useAuth } from '../auth/AuthProvider';
import { useLiveCollection, useLiveDoc } from './hooks';
import { hexToRgbChannels } from './format';

const SELECTED_KEY = 'steerly.platform.schoolId';
const DEFAULT_BRAND = '#F59E0B';

interface SchoolState {
  /** Effective school: the claim, or the school a super-admin picked. */
  schoolId: string | null;
  school: School | null;
  loading: boolean;
  notFound: boolean;
  /** owner (or superAdmin) — branches, settings, team changes. */
  isOwner: boolean;
  members: Member[];
  instructors: Member[];
  courses: Course[];
  branches: Branch[];
  /** Super-admin only: choose which school to open. */
  selectSchool: (id: string | null) => void;
}

const SchoolContext = createContext<SchoolState | null>(null);

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { role, claimSchoolId, isSuperAdmin, user } = useAuth();
  const [selected, setSelected] = useState<string | null>(readSelected);

  const selectSchool = useCallback((id: string | null) => {
    setSelected(id);
    try {
      if (id) localStorage.setItem(SELECTED_KEY, id);
      else localStorage.removeItem(SELECTED_KEY);
    } catch {
      /* private mode */
    }
  }, []);

  const schoolId = user ? (isSuperAdmin ? selected : claimSchoolId) : null;
  const staffish = !!schoolId && (isSuperAdmin || role === 'owner' || role === 'staff');

  const schoolDoc = useLiveDoc<School>(schoolId ? `${COLLECTIONS.schools}/${schoolId}` : null);
  const members = useLiveCollection<Member & { id: string }>(staffish ? schoolCol(schoolId!, 'members') : null);
  const courses = useLiveCollection<Course>(staffish ? schoolCol(schoolId!, 'courses') : null);
  const branches = useLiveCollection<Branch>(staffish ? schoolCol(schoolId!, 'branches') : null);

  const brand = schoolDoc.data?.brandColor || DEFAULT_BRAND;
  useEffect(() => {
    const rgb = hexToRgbChannels(brand) ?? hexToRgbChannels(DEFAULT_BRAND)!;
    document.documentElement.style.setProperty('--brand', rgb);
  }, [brand]);

  const value = useMemo<SchoolState>(() => {
    const memberList = members.data.map((m) => ({ ...m, uid: m.uid || m.id }));
    return {
      schoolId,
      school: schoolDoc.data,
      loading: schoolDoc.loading,
      notFound: !!schoolId && !schoolDoc.loading && !schoolDoc.exists,
      isOwner: isSuperAdmin || role === 'owner',
      members: memberList,
      instructors: memberList.filter((m) => m.role === 'instructor' && m.active !== false),
      courses: [...courses.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
      branches: [...branches.data].sort((a, b) => a.name.localeCompare(b.name)),
      selectSchool,
    };
  }, [schoolId, schoolDoc, isSuperAdmin, role, members.data, courses.data, branches.data, selectSchool]);

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool(): SchoolState {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used inside <SchoolProvider>');
  return ctx;
}

/** For pages rendered inside the school guard: schoolId is guaranteed. */
export function useSchoolId(): string {
  const { schoolId } = useSchool();
  if (!schoolId) throw new Error('No school selected');
  return schoolId;
}
