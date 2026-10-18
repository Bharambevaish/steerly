# Steerly architecture

## Pieces

| Folder | What | Who uses it |
|---|---|---|
| `apps/mobile` | Expo (React Native) app with Expo Router. One app, three modes by role: **prospect** (not signed in: browse courses, enquire), **student**, **instructor** | Students, instructors |
| `apps/admin` | React + Vite dashboard. School owners/staff; super-admin console under `/platform` | School office, Steerly owner |
| `apps/web` | Marketing site + public school pages (`/s/:slug` with enquiry form) + legal pages + school signup entry | Public, new schools |
| `functions` | Firebase Cloud Functions v2, region `asia-south1`, Node 22, bundled with esbuild | Everything trusted |
| `packages/shared` | Types (`models.ts`), callable contract (`api.ts`), paths, skills, money helpers | All of the above |

## Rules of the road

- **Contract first.** Firestore shapes live in `packages/shared/src/models.ts`, callable inputs/outputs in `packages/shared/src/api.ts`. Never redefine them locally; import from `@steerly/shared`.
- **Money is integer paise.** Use `formatINR`, `toPaise`, `toRupees`.
- **Times** are Firestore Timestamps; display in `Asia/Kolkata` (`TIMEZONE`). Use `date-fns` / `date-fns-tz`.
- **Phones** are stored as 10 digits in school data, E.164 (`+91…`) in Auth / `users`. Helpers: `toE164`, `fromE164`.
- **Trusted writes go through callables** (`FN.*`): roles, bookings, payments, receipts, student creation, school creation. Clients do direct Firestore writes only where `firestore.rules` allows it.
- **Claims:** `role`, `schoolId`, `studentId` on the ID token. After a function changes claims, the client must call `user.getIdToken(true)`.
- **Multi-tenant:** every school document lives under `schools/{schoolId}/…`.

## Auth flows

- **Mobile (students/instructors):** phone OTP. `requestOtp` → SMS via MSG91 (or `devCode` in dev mode) → `verifyOtp` returns a custom token → `signInWithCustomToken`. On first login, a pending invite (`schools/*/invites/{+91…}`) or an existing student record with that phone links the user automatically. Otherwise the user joins with a 6-char school code (`joinSchool`).
- **Admin:** phone OTP (same `requestOtp`/`verifyOtp` callables) or email + password. A new owner signs up, then calls `createSchool` (14-day trial). Staff are invited by phone and sign in with OTP.
- **Super admin:** `role=superAdmin` claim set with `npm run set-role`.

## Key flows

1. Enquiry (app or web) → `schools/{id}/enquiries` → trigger notifies admins → admin converts with `convertEnquiry` → student record (+ fee) → student logs in with the same phone and is linked.
2. Admin sets instructor weekly availability → `generateSlots` creates `slots` → student `bookSlot` (transaction, limits from school settings) → reminder 2h before → instructor `completeBooking` (attendance, skills, notes) → student rates.
3. Payment: `createPaymentLink` (Razorpay Payment Link) → student pays in browser → `razorpayWebhook` marks paid, assigns receipt number, generates PDF, updates `student.feePaid`, notifies. Cash/UPI recorded with `recordManualPayment`.
4. Scheduled jobs: lesson reminders (every 15 min), daily expiry/test-date/follow-up reminders (08:00 IST), trial expiry checks.
