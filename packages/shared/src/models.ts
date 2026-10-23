// Firestore document shapes. All money is stored in paise (integer). All times are Firestore Timestamps.
// `FsTimestamp` is structural so both the web SDK and firebase-admin Timestamp types satisfy it.
import type { Role } from './roles';
import type { SkillId, SkillLevel } from './skills';

export interface FsTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ---------- Platform level ----------

export type PlanId = 'starter' | 'pro' | 'whitelabel';
export type SchoolStatus = 'trial' | 'active' | 'past_due' | 'suspended';

/** users/{uid} — one per Firebase Auth user. Written by Cloud Functions (except pushToken/name). */
export interface UserDoc {
  uid: string;
  name: string;
  phone: string | null; // E.164, e.g. +919876543210
  email: string | null;
  role: Role | null;
  schoolId: string | null;
  studentId: string | null; // set when role === 'student'
  expoPushToken: string | null;
  createdAt: FsTimestamp;
}

/** users/{uid}/notifications/{id} — in-app inbox. */
export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  type: 'lesson_reminder' | 'payment' | 'booking' | 'test_date' | 'enquiry' | 'general';
  read: boolean;
  link: string | null; // in-app route, e.g. "/bookings/abc"
  createdAt: FsTimestamp;
}

/** schoolCodes/{code} — public lookup from a 6-char join code to a school. */
export interface SchoolCodeDoc {
  schoolId: string;
  name: string;
}

/** schoolSlugs/{slug} — public lookup from the web URL slug (steerly.app/s/{slug}) to a school. */
export type SchoolSlugDoc = SchoolCodeDoc;

// ---------- School (tenant) ----------

export interface SchoolSettings {
  lessonMinutes: number; // default 60
  cancelBeforeHours: number; // students can cancel up to N hours before
  maxBookingsPerDay: number; // per student
  bookingWindowDays: number; // how far ahead students can book
  gstin: string | null;
  gstPercent: number; // 0 or 18
  upiId: string | null;
  receiptPrefix: string; // e.g. "PDS"
}

export interface SchoolSubscription {
  plan: PlanId;
  status: SchoolStatus;
  trialEndsAt: FsTimestamp | null;
  currentPeriodEnd: FsTimestamp | null;
  razorpaySubscriptionId: string | null;
}

/** schools/{schoolId} */
export interface School {
  id: string;
  name: string;
  slug: string; // url-safe, unique, e.g. "prince-driving-school"
  code: string; // 6-char join code, unique (mirrored in schoolCodes/{code})
  logoUrl: string | null;
  brandColor: string; // hex, e.g. "#F59E0B"
  phone: string;
  email: string | null;
  address: string;
  city: string;
  ownerUid: string;
  settings: SchoolSettings;
  subscription: SchoolSubscription; // only Cloud Functions write this
  createdAt: FsTimestamp;
}

/** schools/{schoolId}/members/{uid} — staff, owners and instructors of a school. */
export interface Member {
  uid: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Exclude<Role, 'student' | 'superAdmin'>;
  active: boolean;
  /** Owners/staff who also give lessons. Instructors always teach; missing means false. */
  teaches?: boolean;
  createdAt: FsTimestamp;
}

/** schools/{schoolId}/invites/{phoneE164} — pending invite, accepted on first OTP login. */
export interface Invite {
  phone: string;
  name: string;
  role: 'owner' | 'staff' | 'instructor';
  invitedBy: string;
  createdAt: FsTimestamp;
}

/** schools/{schoolId}/branches/{id} */
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  active: boolean;
}

export type VehicleType = 'car_manual' | 'car_auto' | 'two_wheeler' | 'heavy';

/** schools/{schoolId}/courses/{id} */
export interface Course {
  id: string;
  name: string;
  description: string;
  vehicleType: VehicleType;
  sessions: number;
  sessionMinutes: number;
  price: number; // paise
  active: boolean;
  order: number;
}

export type EnquiryStatusV2 = 'New' | 'Contacted' | 'Enrolled' | 'Lost';
export type EnquirySource = 'app' | 'web' | 'walk_in' | 'phone' | 'referral';

/** schools/{schoolId}/enquiries/{id} */
export interface EnquiryDoc {
  id: string;
  name: string;
  phone: string; // 10 digits
  courseId: string | null;
  courseName: string;
  preferredTime: string;
  status: EnquiryStatusV2;
  source: EnquirySource;
  notes: string;
  followUpAt: FsTimestamp | null;
  studentId: string | null; // set after conversion
  createdAt: FsTimestamp;
  updatedAt: FsTimestamp | null;
}

export type TestStatus = 'not_applied' | 'applied' | 'scheduled' | 'passed' | 'failed';
export type StudentStatus = 'active' | 'completed' | 'dropped';

/** schools/{schoolId}/students/{studentId} */
export interface Student {
  id: string;
  uid: string | null; // linked Auth user once the student logs in
  name: string;
  phone: string; // 10 digits
  email: string | null;
  address: string | null;
  dob: string | null; // YYYY-MM-DD
  courseId: string;
  courseName: string;
  instructorId: string | null;
  instructorName: string | null;
  branchId: string | null;
  status: StudentStatus;
  sessionsTotal: number;
  sessionsCompleted: number;
  feeTotal: number; // paise
  feePaid: number; // paise — only Cloud Functions write this
  llStatus: TestStatus;
  llNumber: string | null;
  llTestDate: FsTimestamp | null;
  dlStatus: TestStatus;
  dlNumber: string | null;
  dlTestDate: FsTimestamp | null;
  skills: Partial<Record<SkillId, SkillLevel>>;
  referralCode: string;
  enrolledAt: FsTimestamp;
  createdAt: FsTimestamp;
}

export type DocumentType = 'photo' | 'id_proof' | 'address_proof' | 'medical' | 'learner_licence' | 'driving_licence' | 'other';

/** schools/{schoolId}/students/{studentId}/documents/{id}. File at storagePath. */
export interface StudentDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  contentType: string;
  storagePath: string; // schools/{schoolId}/students/{studentId}/{id}-{fileName}
  verified: boolean;
  uploadedBy: string;
  uploadedAt: FsTimestamp;
}

/** schools/{schoolId}/vehicles/{id} */
export interface Vehicle {
  id: string;
  regNumber: string;
  model: string;
  type: VehicleType;
  branchId: string | null;
  insuranceExpiry: FsTimestamp | null;
  pucExpiry: FsTimestamp | null;
  fitnessExpiry: FsTimestamp | null;
  active: boolean;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface TimeRange {
  start: string; // "07:00" (24h, school local time = Asia/Kolkata)
  end: string; // "11:00"
}

/** schools/{schoolId}/availability/{instructorUid} — weekly working hours used to generate slots. */
export interface Availability {
  instructorId: string;
  weekly: Record<Weekday, TimeRange[]>;
  vehicleId: string | null;
  updatedAt: FsTimestamp;
}

export type SlotStatus = 'open' | 'booked' | 'blocked';

/** schools/{schoolId}/slots/{id} — id is `${instructorId}_${startMillis}` so generation is idempotent. */
export interface Slot {
  id: string;
  instructorId: string;
  instructorName: string;
  vehicleId: string | null;
  start: FsTimestamp;
  end: FsTimestamp;
  status: SlotStatus;
  bookingId: string | null;
}

export type BookingStatus = 'booked' | 'completed' | 'cancelled' | 'no_show';

/** schools/{schoolId}/bookings/{id} */
export interface Booking {
  id: string;
  slotId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  instructorId: string;
  instructorName: string;
  vehicleId: string | null;
  start: FsTimestamp;
  end: FsTimestamp;
  status: BookingStatus;
  cancelledBy: string | null;
  cancelReason: string | null;
  skillsCovered: SkillId[];
  instructorNotes: string;
  rating: number | null; // 1-5 from the student
  feedback: string | null;
  reminderSent: boolean;
  createdAt: FsTimestamp;
}

export type PaymentMethod = 'razorpay' | 'cash' | 'upi' | 'bank_transfer';
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'cancelled';

/** schools/{schoolId}/payments/{id} — only Cloud Functions write this. */
export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number; // paise
  method: PaymentMethod;
  status: PaymentStatus;
  note: string;
  receiptNo: string | null; // assigned when paid, e.g. "PDS-2026-00042"
  receiptPath: string | null; // Storage path of the PDF receipt
  razorpayPaymentLinkId: string | null;
  razorpayPaymentLinkUrl: string | null;
  razorpayPaymentId: string | null;
  recordedBy: string | null; // uid for manual payments
  createdAt: FsTimestamp;
  paidAt: FsTimestamp | null;
}
