# Steerly Cloud Functions

Firebase Functions v2, region `asia-south1`, Node 22. TypeScript in `src/`, bundled by esbuild into `lib/index.js`
(`@steerly/shared`, zod and date-fns are bundled; packages in `dependencies` stay external).

```
npm run typecheck -w steerly-functions
npm run build -w steerly-functions
npm run test -w steerly-functions      # vitest, pure logic in src/lib
```

## Functions

| File | Function | Who |
|---|---|---|
| `auth.ts` | `requestOtp`, `verifyOtp` | anyone (phone OTP → custom token, auto-link invite / student) |
| `onboarding.ts` | `createSchool` | signed-in user without a school (or superAdmin) |
| | `joinSchool` | signed-in user without a school (6-char code) |
| | `inviteMember` | owner; staff may invite instructors |
| | `updateMember` | owner (role / active; deactivation clears claims and revokes tokens) |
| `students.ts` | `createStudent`, `convertEnquiry` | owner, staff |
| `scheduling.ts` | `generateSlots` | admin or that instructor |
| | `bookSlot` | student (self) or admin |
| | `cancelBooking` | student (≥ `cancelBeforeHours` ahead), instructor, admin |
| | `completeBooking` | assigned instructor or admin |
| | `rateBooking` | the student, once |
| `payments.ts` | `createPaymentLink` | admin, or student for self |
| | `recordManualPayment` | admin |
| | `getReceiptUrl` | admin or the student (15-min signed URL) |
| | `razorpayWebhook` (HTTP) | Razorpay (signature verified) |
| `reports.ts` | `getDashboardStats` | admin |
| `platform.ts` | `startSubscription` | owner |
| | `setSchoolStatus` | superAdmin |
| `account.ts` | `deleteMyAccount` | any signed-in non-owner |
| `triggers.ts` | `onEnquiryCreated` | new enquiry (app/web) → admins |
| | `lessonReminders` | every 15 min: lessons starting within 2 h |
| | `dailyDigest` | 08:00 IST: vehicle expiries (15/7/3/1/0 days), test dates tomorrow, follow-ups today, trial/past-due/suspension |

## Configuration

Params go in `functions/.env.<projectId>` (see `.env.example`):

| Param | Notes |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay key id |
| `RAZORPAY_PLAN_STARTER`, `RAZORPAY_PLAN_PRO`, `RAZORPAY_PLAN_WHITELABEL` | Razorpay subscription plan ids |
| `MSG91_TEMPLATE_ID` | MSG91 Flow template id (DLT template with variable `##otp##`) |
| `OTP_DEV_MODE` | `true` = no SMS, `requestOtp` returns `devCode` |
| `OTP_TEST_NUMBERS` | comma-separated 10-digit numbers that always accept `123456` (store reviewers) |
| `PUBLIC_WEB_URL` | payment-link callback goes to `${PUBLIC_WEB_URL}/paid` |

| `WHATSAPP_ENABLED` | `true` = also send WhatsApp (AiSensy); default `false` |
| `WHATSAPP_CAMPAIGN_LESSON_REMINDER`, `WHATSAPP_CAMPAIGN_PAYMENT_LINK`, `WHATSAPP_CAMPAIGN_RECEIPT` | AiSensy API campaign names |

Secrets (Secret Manager): `firebase functions:secrets:set NAME` for
`MSG91_AUTH_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `AISENSY_API_KEY`
(`AISENSY_API_KEY` must exist for deploy even when WhatsApp is disabled; any placeholder works).

## WhatsApp (AiSensy)

`src/lib/whatsapp.ts` posts to the AiSensy Campaign API. It never throws; failures are logged. Create one
approved template + "API campaign" per message in AiSensy and put the campaign names in the params above.
Parameters are sent in this order:

| Campaign | Example template | Params |
|---|---|---|
| Lesson reminder (`lessonReminders`, to student) | Hi {{1}}, reminder: your driving lesson with {{2}} is at {{3}}. – {{4}} | student name, instructor name, time, school name |
| Payment link (`createPaymentLink`) | Hi {{1}}, please pay {{2}} for {{3}} at {{4}} using this secure link: {{5}} | student name, amount, course, school name, link |
| Receipt (payment marked paid) | Hi {{1}}, we received {{2}} at {{3}}. Receipt no. {{4}}. Balance due: {{5}}. Thank you! | student name, amount, school name, receipt no, balance due |

Razorpay webhook URL: `https://asia-south1-<projectId>.cloudfunctions.net/razorpayWebhook`, events
`payment_link.paid`, `subscription.activated`, `subscription.charged`, `subscription.resumed`,
`subscription.pending`, `subscription.halted`, `subscription.cancelled`.

## Emulators

```
cp functions/.env.example functions/.env.local      # OTP_DEV_MODE=true
printf "MSG91_AUTH_KEY=dev\nRAZORPAY_KEY_SECRET=dev\nRAZORPAY_WEBHOOK_SECRET=dev\n" > functions/.secret.local
npm run build -w steerly-functions
firebase emulators:start
```

With `OTP_DEV_MODE=true`, `requestOtp` returns `{ sent: true, devCode }`. Numbers in `OTP_TEST_NUMBERS`
always accept `123456` (no SMS is sent, in any mode).

## Deploy notes

- The functions' service account needs **Service Account Token Creator** (`iam.serviceAccounts.signBlob`)
  for `createCustomToken` and signed receipt URLs.
- Indexes needed: see `INDEXES_NEEDED.md`. Add a TTL policy on `otpRequests.ttl`.
