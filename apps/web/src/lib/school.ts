import {
  COLLECTIONS,
  schoolCol,
  type Course,
  type EnquiryInput,
  type School,
  type SchoolSlugDoc,
} from '@steerly/shared';
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore/lite';
import { db } from '../firebase';

/** The public subset of a school we render. Never relies on fields hidden by rules. */
export type PublicSchool = Pick<School, 'id' | 'name' | 'logoUrl' | 'brandColor' | 'phone' | 'city' | 'address'>;
export type PublicCourse = Pick<Course, 'id' | 'name' | 'description' | 'vehicleType' | 'sessions' | 'sessionMinutes' | 'price' | 'order'>;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Resolve the `/s/:slugOrId` URL segment to a school.
 * 1. schoolSlugs/{slug} → { schoolId }  (public get, written by createSchool)
 * 2. fall back to treating the segment as a raw schools/{id}.
 * Returns null when nothing matches.
 */
export async function resolveSchool(slugOrId: string): Promise<PublicSchool | null> {
  const key = slugOrId.trim();
  let schoolId: string | null = null;

  const slug = key.toLowerCase();
  if (SLUG_RE.test(slug)) {
    try {
      const s = await getDoc(doc(db, COLLECTIONS.schoolSlugs, slug));
      if (s.exists()) schoolId = (s.data() as SchoolSlugDoc).schoolId;
    } catch (err) {
      // A permission error here just means "not a slug"; keep going with the id fallback.
      console.warn('schoolSlugs lookup failed', err);
    }
  }
  if (!schoolId && ID_RE.test(key)) schoolId = key;
  if (!schoolId) return null;

  const snap = await getDoc(doc(db, COLLECTIONS.schools, schoolId));
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<School>;
  return {
    id: snap.id,
    name: d.name ?? 'Driving school',
    logoUrl: d.logoUrl ?? null,
    brandColor: d.brandColor ?? '#F59E0B',
    phone: d.phone ?? '',
    city: d.city ?? '',
    address: d.address ?? '',
  };
}

/** Active courses, ordered. Sorted client-side so no composite index is needed. */
export async function fetchCourses(schoolId: string): Promise<PublicCourse[]> {
  const snap = await getDocs(collection(db, schoolCol(schoolId, 'courses')));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Course, 'id'>) }))
    .filter((c) => c.active)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

/** Writes exactly the shape validNewEnquiry() in firestore.rules accepts. */
export async function submitEnquiry(schoolId: string, input: EnquiryInput): Promise<string> {
  const ref = await addDoc(collection(db, schoolCol(schoolId, 'enquiries')), {
    name: input.name,
    phone: input.phone,
    courseId: input.courseId,
    courseName: input.courseName,
    preferredTime: input.preferredTime,
    source: 'web',
    status: 'New',
    notes: '',
    followUpAt: null,
    studentId: null,
    updatedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Best-effort normalisation of a stored phone (10-digit or E.164) to 10 digits. */
export const tenDigits = (phone: string) => phone.replace(/\D/g, '').slice(-10);

/** Guard against odd values in brandColor before we put it in a style attribute. */
export const safeHex = (c: string | null | undefined, fallback = '#F59E0B') =>
  c && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c) ? c : fallback;

/** Black or white text, whichever reads better on the given hex background. */
export function onColor(hex: string): '#0F172A' | '#FFFFFF' {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.179 ? '#0F172A' : '#FFFFFF';
}
