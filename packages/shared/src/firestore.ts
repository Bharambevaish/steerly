// Firestore paths in one place so the apps, functions and rules stay in sync.
export const COLLECTIONS = {
  users: 'users',
  schools: 'schools',
  schoolCodes: 'schoolCodes',
  schoolSlugs: 'schoolSlugs',
  // Legacy Phase 0 flat collection. Phase 1 reads/writes schools/{id}/enquiries instead.
  enquiries: 'enquiries',
} as const;

export const SCHOOL_SUBCOLLECTIONS = {
  members: 'members',
  invites: 'invites',
  branches: 'branches',
  courses: 'courses',
  enquiries: 'enquiries',
  students: 'students',
  vehicles: 'vehicles',
  availability: 'availability',
  slots: 'slots',
  bookings: 'bookings',
  payments: 'payments',
  counters: 'counters',
} as const;

export type SchoolSubcollection = keyof typeof SCHOOL_SUBCOLLECTIONS;

/** schools/{schoolId}/{sub} */
export const schoolCol = (schoolId: string, sub: SchoolSubcollection): string =>
  `${COLLECTIONS.schools}/${schoolId}/${SCHOOL_SUBCOLLECTIONS[sub]}`;

/** schools/{schoolId}/students/{studentId}/documents */
export const studentDocumentsCol = (schoolId: string, studentId: string): string =>
  `${schoolCol(schoolId, 'students')}/${studentId}/documents`;

/** users/{uid}/notifications */
export const inboxCol = (uid: string): string => `${COLLECTIONS.users}/${uid}/notifications`;

/** Storage: schools/{schoolId}/students/{studentId}/{docId}-{fileName} */
export const studentFilePath = (schoolId: string, studentId: string, docId: string, fileName: string): string =>
  `schools/${schoolId}/students/${studentId}/${docId}-${fileName.replace(/[^\w.-]/g, '_')}`;

/** Storage: schools/{schoolId}/branding/logo */
export const schoolLogoPath = (schoolId: string): string => `schools/${schoolId}/branding/logo`;

/** Storage: schools/{schoolId}/receipts/{paymentId}.pdf (written by functions only) */
export const receiptPath = (schoolId: string, paymentId: string): string =>
  `schools/${schoolId}/receipts/${paymentId}.pdf`;

export const DEFAULT_SCHOOL_SETTINGS = {
  lessonMinutes: 60,
  cancelBeforeHours: 6,
  maxBookingsPerDay: 1,
  bookingWindowDays: 14,
  gstin: null,
  gstPercent: 0,
  upiId: null,
  receiptPrefix: 'STR',
} as const;

export const PLANS = {
  starter: { name: 'Starter', priceMonthly: 99900, maxStudents: 50, whiteLabel: false },
  pro: { name: 'Pro', priceMonthly: 249900, maxStudents: 300, whiteLabel: false },
  whitelabel: { name: 'White-label', priceMonthly: 599900, maxStudents: 2000, whiteLabel: true },
} as const;

export const TRIAL_DAYS = 14;
export const TIMEZONE = 'Asia/Kolkata';
