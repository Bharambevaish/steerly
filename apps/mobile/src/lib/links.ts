import type { Href } from 'expo-router';
import type { Role } from '@steerly/shared';

/**
 * Map a backend link (InboxNotification.link / push data.link, e.g. "/bookings/abc", "/payments")
 * to an in-app route for the current role (owners/staff who teach get the instructor routes). Unknown links fall back to the role's home.
 */
export function resolveLink(link: string | null | undefined, role: Role | null, canTeach = false): Href {
  const teaching = role === 'instructor' || (canTeach && (role === 'owner' || role === 'staff'));
  const home: Href = teaching ? '/instructor/today' : role === 'student' ? '/student/home' : '/';
  if (!link) return home;
  const path = link.replace(/^steerly:\/\//, '/').split('?')[0] ?? '';
  const seg = path.split('/').filter(Boolean);
  const first = seg[0] ?? '';
  if (teaching) {
    if (first === 'bookings' || first === 'today') return '/instructor/today';
    if (first === 'slots' || first === 'schedule') return '/instructor/schedule';
    if (first === 'students') return '/instructor/students';
    if (first === 'notifications') return '/notifications';
    return home;
  }
  if (role === 'student') {
    if (first === 'bookings' || first === 'lessons') return '/student/lessons';
    if (first === 'book' || first === 'slots') return '/student/book';
    if (first === 'payments') return '/payments';
    if (first === 'documents') return '/documents';
    if (first === 'progress') return '/student/progress';
    if (first === 'notifications') return '/notifications';
    return home;
  }
  return home;
}
