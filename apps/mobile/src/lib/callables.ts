import { httpsCallable } from 'firebase/functions';
import {
  FN,
  type RequestOtpInput,
  type RequestOtpOutput,
  type VerifyOtpInput,
  type VerifyOtpOutput,
  type JoinSchoolInput,
  type JoinSchoolOutput,
  type BookSlotInput,
  type BookSlotOutput,
  type CancelBookingInput,
  type CompleteBookingInput,
  type RateBookingInput,
  type CreatePaymentLinkInput,
  type CreatePaymentLinkOutput,
  type GetReceiptUrlInput,
  type GetReceiptUrlOutput,
  type OkOutput,
  type DeleteMyAccountInput,
} from '@steerly/shared';
import { functions } from './firebase';

function callable<I, O>(name: string) {
  const fn = httpsCallable<I, O>(functions, name);
  return async (input: I): Promise<O> => (await fn(input)).data;
}

export const api = {
  requestOtp: callable<RequestOtpInput, RequestOtpOutput>(FN.requestOtp),
  verifyOtp: callable<VerifyOtpInput, VerifyOtpOutput>(FN.verifyOtp),
  joinSchool: callable<JoinSchoolInput, JoinSchoolOutput>(FN.joinSchool),
  bookSlot: callable<BookSlotInput, BookSlotOutput>(FN.bookSlot),
  cancelBooking: callable<CancelBookingInput, OkOutput>(FN.cancelBooking),
  completeBooking: callable<CompleteBookingInput, OkOutput>(FN.completeBooking),
  rateBooking: callable<RateBookingInput, OkOutput>(FN.rateBooking),
  createPaymentLink: callable<CreatePaymentLinkInput, CreatePaymentLinkOutput>(FN.createPaymentLink),
  getReceiptUrl: callable<GetReceiptUrlInput, GetReceiptUrlOutput>(FN.getReceiptUrl),
  deleteMyAccount: callable<DeleteMyAccountInput, OkOutput>(FN.deleteMyAccount),
};

const FRIENDLY: Record<string, string> = {
  'functions/unavailable': 'Can’t reach the server. Check your internet and try again.',
  'functions/deadline-exceeded': 'That took too long. Please try again.',
  'functions/internal': 'Something went wrong on our side. Please try again.',
  'functions/unauthenticated': 'Please log in again.',
  'functions/not-found': 'That feature isn’t available yet.',
  'permission-denied': 'You don’t have access to that.',
  unavailable: 'You seem to be offline. We’ll sync when you’re back.',
  'storage/unauthorized': 'You don’t have permission to upload here.',
  'storage/canceled': 'Upload cancelled.',
};

/** Turn any thrown value (HttpsError, FirebaseError, Error) into a message safe to show users. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e && typeof e === 'object') {
    const err = e as { code?: unknown; message?: unknown };
    const code = typeof err.code === 'string' ? err.code : '';
    const msg = typeof err.message === 'string' ? err.message : '';
    // HttpsErrors thrown on purpose by our functions carry a human message; prefer it.
    const generic = !msg || msg === 'internal' || msg === 'INTERNAL' || /^\w+\/[\w-]+$/.test(msg);
    if (code.startsWith('functions/') && !generic) return msg;
    if (FRIENDLY[code]) return FRIENDLY[code];
    if (!code && !generic && !msg.startsWith('Firebase:')) return msg;
  }
  return fallback;
}
