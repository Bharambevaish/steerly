// Contract for Firebase callable functions (region asia-south1).
// Clients: httpsCallable<Input, Output>(functions, FN.xyz). Functions: validate with the matching schema.
import { z } from 'zod';
import { phoneSchema } from './enquiry';
import { SKILL_IDS } from './skills';

export const FUNCTIONS_REGION = 'asia-south1';

export const FN = {
  // Auth (phone OTP via SMS provider → Firebase custom token; works in Expo Go)
  requestOtp: 'requestOtp',
  verifyOtp: 'verifyOtp',
  // Onboarding & membership
  createSchool: 'createSchool',
  joinSchool: 'joinSchool',
  inviteMember: 'inviteMember',
  updateMember: 'updateMember',
  // Students
  convertEnquiry: 'convertEnquiry',
  createStudent: 'createStudent',
  // Scheduling
  generateSlots: 'generateSlots',
  bookSlot: 'bookSlot',
  cancelBooking: 'cancelBooking',
  completeBooking: 'completeBooking',
  rateBooking: 'rateBooking',
  // Payments
  createPaymentLink: 'createPaymentLink',
  recordManualPayment: 'recordManualPayment',
  getReceiptUrl: 'getReceiptUrl',
  // Reports
  getDashboardStats: 'getDashboardStats',
  // Platform / billing
  startSubscription: 'startSubscription',
  setSchoolStatus: 'setSchoolStatus',
  // Account (Google Play data-deletion requirement)
  deleteMyAccount: 'deleteMyAccount',
} as const;

const id = z.string().min(1).max(128);
const schoolId = id;
const isoDateTime = z.iso.datetime({ offset: true });
const isoDate = z.iso.date(); // YYYY-MM-DD

// ---------- Auth ----------
export const requestOtpSchema = z.object({ phone: phoneSchema });
export type RequestOtpInput = z.input<typeof requestOtpSchema>;
export interface RequestOtpOutput {
  sent: true;
  /** Only returned when the function runs with OTP_DEV_MODE=true (emulator / testing). */
  devCode?: string;
}

export const verifyOtpSchema = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) });
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>;
export interface VerifyOtpOutput {
  /** Pass to signInWithCustomToken. Claims (role, schoolId, studentId) are already set. */
  token: string;
  isNewUser: boolean;
}

// ---------- Onboarding ----------
export const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  phone: phoneSchema,
  address: z.string().trim().max(200).default(''),
  ownerName: z.string().trim().min(2).max(80),
});
export type CreateSchoolInput = z.input<typeof createSchoolSchema>;
export interface CreateSchoolOutput {
  schoolId: string;
  code: string;
}

export const joinSchoolSchema = z.object({
  code: z.string().trim().toUpperCase().length(6),
  name: z.string().trim().min(2).max(80),
});
export type JoinSchoolInput = z.input<typeof joinSchoolSchema>;
export interface JoinSchoolOutput {
  schoolId: string;
  studentId: string;
}

export const inviteMemberSchema = z.object({
  schoolId,
  phone: phoneSchema,
  name: z.string().trim().min(2).max(80),
  role: z.enum(['owner', 'staff', 'instructor']),
});
export type InviteMemberInput = z.input<typeof inviteMemberSchema>;

export const updateMemberSchema = z.object({
  schoolId,
  uid: id,
  role: z.enum(['owner', 'staff', 'instructor']).optional(),
  active: z.boolean().optional(),
});
export type UpdateMemberInput = z.input<typeof updateMemberSchema>;

// ---------- Students ----------
const studentBase = {
  schoolId,
  courseId: id,
  instructorId: id.nullable().default(null),
  branchId: id.nullable().default(null),
  /** Override the course price, in paise (discounts). */
  feeTotal: z.number().int().min(0).optional(),
};

export const convertEnquirySchema = z.object({ ...studentBase, enquiryId: id });
export type ConvertEnquiryInput = z.input<typeof convertEnquirySchema>;

export const createStudentSchema = z.object({
  ...studentBase,
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.email().nullable().default(null),
});
export type CreateStudentInput = z.input<typeof createStudentSchema>;
export interface StudentCreatedOutput {
  studentId: string;
}

// ---------- Scheduling ----------
export const generateSlotsSchema = z.object({
  schoolId,
  instructorId: id,
  from: isoDate,
  to: isoDate, // inclusive, max 31 days after `from`
});
export type GenerateSlotsInput = z.input<typeof generateSlotsSchema>;
export interface GenerateSlotsOutput {
  created: number;
  skipped: number;
}

export const bookSlotSchema = z.object({
  schoolId,
  slotId: id,
  /** Required when an admin books for a student; ignored for students (uses their own claim). */
  studentId: id.optional(),
});
export type BookSlotInput = z.input<typeof bookSlotSchema>;
export interface BookSlotOutput {
  bookingId: string;
}

export const cancelBookingSchema = z.object({
  schoolId,
  bookingId: id,
  reason: z.string().trim().max(200).default(''),
});
export type CancelBookingInput = z.input<typeof cancelBookingSchema>;

export const completeBookingSchema = z.object({
  schoolId,
  bookingId: id,
  attendance: z.enum(['present', 'no_show']),
  skillsCovered: z.array(z.enum(SKILL_IDS)).default([]),
  /** New levels for skills (0-3); merged into student.skills. */
  skillLevels: z.partialRecord(z.enum(SKILL_IDS), z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])).default({}),
  notes: z.string().trim().max(1000).default(''),
});
export type CompleteBookingInput = z.input<typeof completeBookingSchema>;

export const rateBookingSchema = z.object({
  schoolId,
  bookingId: id,
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(500).default(''),
});
export type RateBookingInput = z.input<typeof rateBookingSchema>;

// ---------- Payments ----------
export const createPaymentLinkSchema = z.object({
  schoolId,
  studentId: id.optional(), // students omit (uses claim)
  amount: z.number().int().min(100), // paise, min ₹1
});
export type CreatePaymentLinkInput = z.input<typeof createPaymentLinkSchema>;
export interface CreatePaymentLinkOutput {
  paymentId: string;
  url: string;
}

export const recordManualPaymentSchema = z.object({
  schoolId,
  studentId: id,
  amount: z.number().int().min(100),
  method: z.enum(['cash', 'upi', 'bank_transfer']),
  note: z.string().trim().max(200).default(''),
});
export type RecordManualPaymentInput = z.input<typeof recordManualPaymentSchema>;
export interface PaymentRecordedOutput {
  paymentId: string;
  receiptNo: string;
}

export const getReceiptUrlSchema = z.object({ schoolId, paymentId: id });
export type GetReceiptUrlInput = z.input<typeof getReceiptUrlSchema>;
export interface GetReceiptUrlOutput {
  url: string; // signed URL valid for 15 minutes
}

// ---------- Reports ----------
export const getDashboardStatsSchema = z.object({
  schoolId,
  from: isoDateTime,
  to: isoDateTime,
});
export type GetDashboardStatsInput = z.input<typeof getDashboardStatsSchema>;
export interface DashboardStats {
  newEnquiries: number;
  conversionRate: number; // 0-1, enrolled / all enquiries in range
  activeStudents: number;
  lessonsCompleted: number;
  noShows: number;
  revenue: number; // paise collected in range
  outstanding: number; // paise still due across active students
  revenueByDay: { date: string; amount: number }[];
  lessonsByInstructor: { instructorId: string; name: string; completed: number; avgRating: number | null }[];
  enquiriesBySource: { source: string; count: number }[];
}

// ---------- Platform ----------
export const startSubscriptionSchema = z.object({
  schoolId,
  plan: z.enum(['starter', 'pro', 'whitelabel']),
});
export type StartSubscriptionInput = z.input<typeof startSubscriptionSchema>;
export interface StartSubscriptionOutput {
  url: string; // Razorpay subscription checkout link
}

export const setSchoolStatusSchema = z.object({
  schoolId,
  status: z.enum(['trial', 'active', 'past_due', 'suspended']),
});
export type SetSchoolStatusInput = z.input<typeof setSchoolStatusSchema>;

/** Deletes the caller's Auth user, users/{uid} doc and inbox, unlinks student.uid (school keeps
 * the student record for legal/accounting retention) and removes unverified uploaded documents.
 * Owners must transfer ownership first (fails with failed-precondition). */
export const deleteMyAccountSchema = z.object({ confirm: z.literal('DELETE') });
export type DeleteMyAccountInput = z.input<typeof deleteMyAccountSchema>;

export interface OkOutput {
  ok: true;
}
