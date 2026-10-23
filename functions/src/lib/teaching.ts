import type { Member } from '@steerly/shared';

/**
 * Whether a member gives lessons: active instructors always do; active owners/staff do when
 * `teaches` is true ("also teaches"). Use this everywhere instead of `role === 'instructor'`.
 */
export function canTeach(m: Pick<Member, 'role' | 'active' | 'teaches'> | null | undefined): boolean {
  if (!m || !m.active) return false;
  if (m.role === 'instructor') return true;
  return (m.role === 'owner' || m.role === 'staff') && m.teaches === true;
}
