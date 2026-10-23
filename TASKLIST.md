# Steerly — Master Task List

~~Struck through~~ = done. Plain text = still to do.
Full steps for your tasks are in [USER_TODO.md](USER_TODO.md) (same IDs). Claude updates this file as work finishes.

_Last updated: 2026-10-24_

---

## 1. Claude's tasks

### Phase 0 — Foundation
- ~~Rename the product from "Prince Driving School" to **Steerly**~~
- ~~Review the project and choose the tech stack (kept React Native + React + Firebase; Flutter not needed)~~
- ~~Write the phased plan (PLAN.md)~~
- ~~Set up git with a baseline commit~~
- ~~Convert to a monorepo (apps/mobile, apps/admin, packages/shared)~~
- ~~Move Firebase config into git-ignored `.env.local` files~~
- ~~Write Firestore and Storage security rules~~
- ~~Admin login with role check~~
- ~~Fix the `justifyContent: 'between'` bug and the deprecated SafeAreaView~~

### Phases 1–6 — Product
- ~~Shared data model + API contract for many schools~~
- ~~Backend (24 Cloud Functions): OTP login, school signup, invites, students, slot booking, lessons, Razorpay payments + webhook, GST receipt PDFs, reports, subscriptions, reminders, account deletion~~
- ~~WhatsApp reminders through AiSensy (off until you set it up)~~
- ~~Admin dashboard: leads, students, schedule, payments, reports, settings, billing, super-admin console~~
- ~~Mobile app: course browsing, enquiry, OTP login, student tabs, instructor tabs, documents, payments, push notifications, delete account~~
- ~~Website: landing page, public school pages, payment confirmation page, legal pages, 404~~
- ~~Database indexes~~

### Testing & quality
- ~~Install Java 21 and the Firebase CLI~~
- ~~End-to-end test on the local Firebase emulators (58/58 steps pass)~~
- ~~Fix the receipt download on the emulator~~
- ~~Check the admin dashboard in a browser against the emulators~~
- ~~Check the website in a browser (desktop + phone); fix the overlapping hero cards~~
- ~~GitHub Actions CI: type checks, tests, builds, Android bundle, end-to-end test~~
- ~~Fix expo-router not installing at the top level; typed routes back on~~
- ~~Fix: 19 backend files were never committed (bad ignore rule)~~
- ~~Admin lint: 19 warnings → 0~~
- ~~Make the scheduled reminder jobs testable, and test them~~
- Test the mobile app (browser version) against the emulators with demo data
- Add emulator mode to the website and test a school's public page with demo data

### Extra features
- ~~Owners/staff who also teach can be instructors (admin, mobile, backend)~~
- ~~Instructor rename updates their students and upcoming lessons~~
- ~~Ownership transfer + owner can step down~~
- ~~"Delete my account" in the admin dashboard~~
- ~~Demo data script (`npm run seed`) with a full Prince Driving School~~
- ~~Lightweight shared import so the website's landing page loads 27 kB less~~

### Mobile build setup
- ~~EAS build profiles (development, preview, production)~~
- ~~One build per school (white-label build settings)~~
- ~~Browser version of the app + local emulator mode~~
- ~~Offline banner with expo-network~~
- ~~Install expo-dev-client~~

### Brand
- ~~Steerly logo (steering wheel "S")~~
- ~~App icon, Android icon layers, splash, favicons~~
- ~~Social share image (og.png)~~
- ~~`npm run brand` to regenerate everything~~

### Background tasks shown as "Failed" (retried 2026-10-24, all passed)
Most were servers Claude stopped on purpose once their checks were done; the reinstall's only error was a follow-up `ls` check. Each was re-run as a check that finishes on its own:
- ~~Start Firebase emulators with demo project~~ (emulators up, OTP sign-in works)
- ~~Start emulators with JDK 21~~ (Java 21, OTP sign-in works)
- ~~Restart emulators with longer discovery timeout~~ (OTP sign-in works)
- ~~Start emulators again~~ (full end-to-end test: **58/58 passed**)
- ~~Start admin dashboard in emulator mode~~ (serves pages wired to the emulators)
- ~~Start admin in emulator mode on 5173~~ (login page HTTP 200)
- ~~Start website dev server~~ (HTTP 200)
- ~~Website preview server (bq9l38fe8)~~ (built site served, HTTP 200)
- ~~Reinstall to hoist expo-router to root~~ (all four packages at top level, one React)
- ~~End-to-end test now waits up to 3 min per call, so it also passes on a low-memory laptop~~

---

## 2. Your tasks (need your accounts, money or decisions)

### A. Accounts
- A1 Private GitHub repo + push the code
- A2 Buy a domain and check the trademark
- A3 Firebase projects `steerly-dev` and `steerly-prod` (Blaze plan)
- A4 Turn on Firestore, Storage and Email/Password sign-in
- A5 Web app config into the `.env.local` files
- A6 Razorpay account (KYC)
- A7 MSG91 account + DLT registration
- A8 Expo account
- A9 Google Play developer account
- A10 Apple developer account (only for iOS)

### B. Setup
- B1 `firebase login` (the CLI itself is already installed in the project: `npx firebase`)
- B2 Point `.firebaserc` at `steerly-dev`
- B3 Set the 4 secrets
- B4 `functions/.env.steerly-dev`
- B5 Deploy rules + functions
- B5a Token Creator role for the functions service account
- B5b TTL policy on `otpRequests`
- B5c Razorpay subscription plans
- B5d MSG91 OTP template
- ~~B5e Local `functions/.secret.local` (Claude created it)~~
- B5f Storage CORS for the admin site
- B6 Razorpay webhook
- B7 Make yourself super admin
- B8 App Check
- B8a Hosting sites + domain
- B9 *(optional)* WhatsApp via AiSensy
- B10 EAS project + env values
- B11 Push notification credentials
- B12 White-label build for Prince Driving School

### C. Before going live
- C1 Rename the folder / move it out of OneDrive
- C2 *(optional)* Replace the logo with a designer's version
- C3 Lawyer review of the legal pages
- C4 Create Prince Driving School as the first real school
- C5 Build the Android app and upload to Play Console
- C6 Deploy the admin dashboard + website
- C7 Switch to live Razorpay keys, turn off OTP dev mode

### D. Decisions & content
- D1 Razorpay setup: one account vs Razorpay Route
- D2 Final domain everywhere
- D3 Fill the [brackets] in the legal pages
- D4 Real email addresses
- D5 Confirm the promises in the website text
- ~~D6 Social share image (Claude made it)~~
- D7 Play Store link + live admin URL in the website settings
