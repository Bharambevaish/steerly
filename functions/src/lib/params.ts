import { defineBoolean, defineInt, defineSecret, defineString } from 'firebase-functions/params';

// Secrets (Secret Manager): firebase functions:secrets:set <NAME>. Emulator: functions/.secret.local
export const MSG91_AUTH_KEY = defineSecret('MSG91_AUTH_KEY');
export const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
export const RAZORPAY_WEBHOOK_SECRET = defineSecret('RAZORPAY_WEBHOOK_SECRET');

// Plain params (functions/.env.<projectId>)
export const MSG91_TEMPLATE_ID = defineString('MSG91_TEMPLATE_ID', { default: '' });
export const OTP_DEV_MODE = defineString('OTP_DEV_MODE', { default: 'false' });
export const OTP_TEST_NUMBERS = defineString('OTP_TEST_NUMBERS', { default: '' });
export const RAZORPAY_KEY_ID = defineString('RAZORPAY_KEY_ID', { default: '' });
export const RAZORPAY_PLAN_STARTER = defineString('RAZORPAY_PLAN_STARTER', { default: '' });
export const RAZORPAY_PLAN_PRO = defineString('RAZORPAY_PLAN_PRO', { default: '' });
export const RAZORPAY_PLAN_WHITELABEL = defineString('RAZORPAY_PLAN_WHITELABEL', { default: '' });
// WhatsApp (AiSensy). Off unless WHATSAPP_ENABLED=true; campaign names come from the AiSensy dashboard.
export const AISENSY_API_KEY = defineSecret('AISENSY_API_KEY');
export const WHATSAPP_ENABLED = defineString('WHATSAPP_ENABLED', { default: 'false' });
export const WHATSAPP_CAMPAIGN_LESSON_REMINDER = defineString('WHATSAPP_CAMPAIGN_LESSON_REMINDER', { default: '' });
export const WHATSAPP_CAMPAIGN_PAYMENT_LINK = defineString('WHATSAPP_CAMPAIGN_PAYMENT_LINK', { default: '' });
export const WHATSAPP_CAMPAIGN_RECEIPT = defineString('WHATSAPP_CAMPAIGN_RECEIPT', { default: '' });
export const PUBLIC_WEB_URL = defineString('PUBLIC_WEB_URL', { default: 'https://steerly.app' });

// Abuse protection. ENFORCE_APP_CHECK rejects callable requests without a valid App Check token
// (turn on only when every client sends one; see docs/SECURITY_REVIEW.md H2).
export const ENFORCE_APP_CHECK = defineBoolean('ENFORCE_APP_CHECK', { default: false });
/** Max OTP SMS per hour from one client IP (best effort; IPs can be shared or spoofed). */
export const OTP_MAX_PER_IP_HOUR = defineInt('OTP_MAX_PER_IP_HOUR', { default: 20 });
/** Hard platform-wide cap on OTP SMS per day (IST). Protects the SMS bill from pumping attacks. */
export const OTP_DAILY_CAP = defineInt('OTP_DAILY_CAP', { default: 1000 });
