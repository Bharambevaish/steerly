// Steerly Cloud Functions (v2, region asia-south1). lib/admin sets global options and initialises the Admin SDK.
import './lib/admin';

export { requestOtp, verifyOtp } from './auth';
export { createSchool, joinSchool, inviteMember, updateMember } from './onboarding';
export { convertEnquiry, createStudent } from './students';
export { generateSlots, bookSlot, cancelBooking, completeBooking, rateBooking } from './scheduling';
export { createPaymentLink, recordManualPayment, getReceiptUrl, razorpayWebhook } from './payments';
export { getDashboardStats } from './reports';
export { startSubscription, setSchoolStatus } from './platform';
export { deleteMyAccount } from './account';
export { onEnquiryCreated, lessonReminders, dailyDigest } from './triggers';
