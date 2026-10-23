// Steerly Cloud Functions (v2, region asia-south1). lib/admin sets global options and initialises the Admin SDK.
import './lib/admin';
import { makeDevRunScheduled } from './dev';

export { requestOtp, verifyOtp } from './auth';
export { createSchool, joinSchool, inviteMember, updateMember } from './onboarding';
export { convertEnquiry, createStudent } from './students';
export { generateSlots, bookSlot, cancelBooking, completeBooking, rateBooking } from './scheduling';
export { createPaymentLink, recordManualPayment, getReceiptUrl, razorpayWebhook } from './payments';
export { getDashboardStats } from './reports';
export { startSubscription, setSchoolStatus } from './platform';
export { deleteMyAccount } from './account';
export { onEnquiryCreated, lessonReminders, dailyDigest } from './triggers';
export { onMemberUpdated } from './members';

// Emulator only: run a scheduled job on demand (e2e tests, demos). Undefined exports are ignored by
// the Functions loader, so this is never discovered by `firebase deploy`.
export const devRunScheduled = process.env.FUNCTIONS_EMULATOR === 'true' ? makeDevRunScheduled() : undefined;
