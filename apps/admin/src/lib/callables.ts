import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import {
  FN,
  type BookSlotInput,
  type BookSlotOutput,
  type CancelBookingInput,
  type CompleteBookingInput,
  type ConvertEnquiryInput,
  type CreatePaymentLinkInput,
  type CreatePaymentLinkOutput,
  type CreateSchoolInput,
  type CreateSchoolOutput,
  type CreateStudentInput,
  type DeleteMyAccountInput,
  type DashboardStats,
  type GenerateSlotsInput,
  type GenerateSlotsOutput,
  type GetDashboardStatsInput,
  type GetReceiptUrlInput,
  type GetReceiptUrlOutput,
  type InviteMemberInput,
  type OkOutput,
  type PaymentRecordedOutput,
  type RecordManualPaymentInput,
  type RequestOtpInput,
  type RequestOtpOutput,
  type SetSchoolStatusInput,
  type StartSubscriptionInput,
  type StartSubscriptionOutput,
  type StudentCreatedOutput,
  type UpdateMemberInput,
  type VerifyOtpInput,
  type VerifyOtpOutput,
} from '@steerly/shared';
import { functions } from './firebase';

/** Input/output pairs for every callable the admin uses. Mirrors packages/shared/src/api.ts. */
interface Callables {
  requestOtp: [RequestOtpInput, RequestOtpOutput];
  verifyOtp: [VerifyOtpInput, VerifyOtpOutput];
  createSchool: [CreateSchoolInput, CreateSchoolOutput];
  inviteMember: [InviteMemberInput, OkOutput];
  updateMember: [UpdateMemberInput, OkOutput];
  convertEnquiry: [ConvertEnquiryInput, StudentCreatedOutput];
  createStudent: [CreateStudentInput, StudentCreatedOutput];
  generateSlots: [GenerateSlotsInput, GenerateSlotsOutput];
  bookSlot: [BookSlotInput, BookSlotOutput];
  cancelBooking: [CancelBookingInput, OkOutput];
  completeBooking: [CompleteBookingInput, OkOutput];
  createPaymentLink: [CreatePaymentLinkInput, CreatePaymentLinkOutput];
  recordManualPayment: [RecordManualPaymentInput, PaymentRecordedOutput];
  getReceiptUrl: [GetReceiptUrlInput, GetReceiptUrlOutput];
  getDashboardStats: [GetDashboardStatsInput, DashboardStats];
  startSubscription: [StartSubscriptionInput, StartSubscriptionOutput];
  setSchoolStatus: [SetSchoolStatusInput, OkOutput];
  deleteMyAccount: [DeleteMyAccountInput, OkOutput];
}

export type CallableName = keyof Callables & keyof typeof FN;

/** Typed wrapper: `await call('bookSlot', { schoolId, slotId, studentId })`. */
export async function call<K extends CallableName>(name: K, input: Callables[K][0]): Promise<Callables[K][1]> {
  const fn = httpsCallable<Callables[K][0], Callables[K][1]>(functions, FN[name]);
  const res = await fn(input);
  return res.data;
}

/** Human-readable message for Firebase / callable / unknown errors. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'permission-denied':
      case 'functions/permission-denied':
        return err.message && !err.message.startsWith('Missing or insufficient')
          ? err.message
          : "You don't have permission to do that.";
      case 'functions/unavailable':
      case 'unavailable':
        return 'Network problem. Check your connection and try again.';
      case 'functions/not-found':
        return err.message || 'Not found.';
      case 'functions/internal':
        return 'Server error. Please try again in a moment.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Wrong email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes and try again.';
      case 'auth/invalid-email':
        return 'That email address is not valid.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
    }
    if (err.message) return err.message.replace(/^Firebase:\s*/, '');
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
