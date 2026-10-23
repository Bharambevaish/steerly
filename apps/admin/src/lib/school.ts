import { createContext, useContext } from 'react';
import type { Branch, Course, Member, School } from '@steerly/shared';

export interface SchoolState {
  /** Effective school: the claim, or the school a super-admin picked. */
  schoolId: string | null;
  school: School | null;
  loading: boolean;
  notFound: boolean;
  /** owner (or superAdmin) — branches, settings, team changes. */
  isOwner: boolean;
  members: Member[];
  /** Active members who give lessons: instructors, plus owners/staff with `teaches`. */
  instructors: Member[];
  courses: Course[];
  branches: Branch[];
  /** Super-admin only: choose which school to open. */
  selectSchool: (id: string | null) => void;
}

export const SchoolContext = createContext<SchoolState | null>(null);

/** Instructors always teach; owners/staff only when they've switched on "Also gives lessons". */
export const givesLessons = (m: Pick<Member, 'role' | 'teaches'>): boolean => m.role === 'instructor' || m.teaches === true;

/** Active members that can be assigned students and lessons. */
export const isActiveInstructor = (m: Pick<Member, 'role' | 'teaches' | 'active'>): boolean => m.active !== false && givesLessons(m);

/** Name for instructor pickers; owners/staff who teach are marked so they're easy to tell apart. */
export const instructorLabel = (m: Pick<Member, 'name' | 'role'>): string =>
  m.role === 'instructor' ? m.name : `${m.name} (${m.role === 'owner' ? 'owner' : 'office'})`;

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
