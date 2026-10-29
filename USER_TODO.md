# Your To-Do List (things only you can do)

Claude keeps this list updated while it builds. Do these at the end, top to bottom; nothing below blocks the code from being written.
Status: ⬜ to do · ✅ done

---

## ★ Start here: see the whole product on your laptop (no accounts needed)

Needs Java 21 (already installed by Claude at `%LOCALAPPDATA%\Programs\jdk21`). In PowerShell:

```powershell
$env:JAVA_HOME="$env:LOCALAPPDATA\Programs\jdk21\jdk-21.0.12.1+1"; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"; $env:FUNCTIONS_DISCOVERY_TIMEOUT=60
npm run emulators          # terminal 1 — leave running
npm run seed               # terminal 2 — creates a demo "Prince Driving School"
npm run admin:emulator     # terminal 2 — dashboard at http://localhost:5173
```

Log in on the dashboard with phone **9000000001**, OTP **123456** (owner). Instructors: 9000000002 / 9000000003 (OTP 123456, mobile app).
Public school page: `npm run web:emulator`, then open http://localhost:5174/s/prince-driving-school
Mobile app in the browser: copy `apps/mobile/.env.emulator.example` to `apps/mobile/.env.local` (back up your real one first), then `cd apps/mobile && npx expo start --web`. Student login 9000000011, instructor 9000000002, OTP 123456.

Tip: your laptop has 7.8 GB RAM. Close other heavy apps (IDEs, Python checker, MySQL) before running all of this at once.

---

## ★ Using the free Firebase plan first?
Follow **[docs/FIREBASE_FREE_SETUP.md](docs/FIREBASE_FREE_SETUP.md)**: no card needed. It replaces A3–A5, B1–B2, B5, B7 and B8a below for now. Without Blaze, logins, booking and payments stay off. Do the rest of section B when you upgrade.

## A. Accounts to create (one-time)

| # | Task | Why | Status |
|---|---|---|---|
| A1 | ~~GitHub repo + push~~ — done: https://github.com/Bharambevaish/steerly (public). The automatic GitHub checks run on every push | ✅ |
| A2 | Buy the domain (e.g. `steerly.app` or `steerly.in`). Check it's free on a registrar and search the name on the [trademark site](https://ipindiaonline.gov.in/eregister/) | Brand + website | ⬜ |
| A3 | Create Firebase projects **`steerly-dev`** and **`steerly-prod`** (console.firebase.google.com). On the free plan, create only `steerly-dev` (see the free-plan guide). Upgrade to **Blaze** later for logins, booking and payments; the free allowance still applies | Backend | ⬜ |
| A4 | In each project: **Firestore** (location `asia-south1` Mumbai), **Storage**, **Authentication → Email/Password** on | Backend | ⬜ |
| A5 | Register a **Web app** in each project and copy the config into `apps/admin/.env.local`, `apps/mobile/.env.local` and `apps/web/.env.local` (templates are the `.env.example` files) | Connect apps | ⬜ |
| A6 | **Razorpay** account (business KYC). Get Test keys first, Live keys after KYC | Payments | ⬜ |
| A7 | **MSG91** account (or another Indian SMS provider) + DLT registration for the OTP template | OTP login SMS | ⬜ |
| A8 | **Expo** account (expo.dev), then `npx eas login` and `npx eas init` inside `apps/mobile` | App builds + push notifications | ⬜ |
| A9 | **Google Play Console** developer account (₹2,100 one-time) | Publish Android app | ⬜ |
| A10 | **Apple Developer** account ($99/yr) — only when you want iOS | Publish iOS app | ⬜ |

## B. Setup commands (after A3–A8)

| # | Task | Status |
|---|---|---|
| B1 | `npm install -g firebase-tools` then `firebase login` | ⬜ |
| B2 | Edit `.firebaserc`: replace `prince-driving-school` with `steerly-dev` (and add `"prod": "steerly-prod"`) | ⬜ |
| B3 | Secrets: `firebase functions:secrets:set RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `MSG91_AUTH_KEY`, `AISENSY_API_KEY` (**all four must exist before deploying** — use a dummy value like `x` for any you don't have yet) | ⬜ |
| B4 | Copy `functions/.env.example` → `functions/.env.steerly-dev`, fill `RAZORPAY_KEY_ID`, `MSG91_TEMPLATE_ID` | ⬜ |
| B5 | Deploy: `firebase deploy --only firestore,storage,functions` | ⬜ |
| B6 | Razorpay dashboard → Webhooks → add `https://asia-south1-steerly-dev.cloudfunctions.net/razorpayWebhook`, events `payment_link.paid`, `subscription.activated`, `subscription.charged`, `subscription.resumed`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`; use the same secret as B3. Also enable Cloud Scheduler API (for the reminder jobs) | ⬜ |
| B7 | Make yourself super admin: download a service-account key (Project settings → Service accounts), then `npm run set-role -- you@email.com superAdmin` | ⬜ |
| B5a | Google Cloud console → IAM: give the **App Engine / Compute default service account** (the one Functions runs as) the role **Service Account Token Creator** (needed for OTP login tokens + receipt download links) | ⬜ |
| B5b | Firestore → TTL policies: add collection `otpRequests`, field `ttl` (auto-deletes old OTPs) | ⬜ |
| B5c | Razorpay → Subscriptions → create 3 plans (Starter ₹999, Pro ₹2,499, White-label ₹5,999 monthly) and put their ids in `RAZORPAY_PLAN_STARTER/PRO/WHITELABEL` in `functions/.env.steerly-dev` | ⬜ |
| B5d | MSG91: get a DLT-approved OTP **Flow** template that uses the variable `##otp##`; put its id in `MSG91_TEMPLATE_ID` | ⬜ |
| B5e | For local testing: create `functions/.secret.local` with dummy values (see `functions/README.md`) | ⬜ |
| B5f | Allow the admin website to upload/download files: edit the origins in `storage.cors.json` (your real admin URL), then run `gcloud storage buckets update gs://steerly-dev.firebasestorage.app --cors-file=storage.cors.json` (needs the Google Cloud CLI) | ⬜ |
| B8a | Hosting: in Firebase console → Hosting, add two sites (e.g. `steerly-admin`, `steerly-web`), then `firebase target:apply hosting admin steerly-admin` and `firebase target:apply hosting web steerly-web`. Connect your domain: `app.<domain>` → admin, `<domain>` → web | ⬜ |
| B8 | Enable **App Check** (reCAPTCHA v3 for web), put the site key in `VITE_APPCHECK_RECAPTCHA_SITE_KEY` | ⬜ |

| B9 | *(Optional, WhatsApp)* AiSensy account → create 3 API campaigns with approved templates, put names in `WHATSAPP_CAMPAIGN_LESSON_REMINDER/PAYMENT_LINK/RECEIPT`, set `WHATSAPP_ENABLED=true`:<br>1. Lesson reminder: "Hi {{1}}, reminder: your driving lesson with {{2}} is at {{3}}. – {{4}}" (student, instructor, time, school)<br>2. Payment link: "Hi {{1}}, please pay {{2}} for {{3}} at {{4}} using this secure link: {{5}}" (student, amount, course, school, link)<br>3. Receipt: "Hi {{1}}, we received {{2}} at {{3}}. Receipt no. {{4}}. Balance due: {{5}}. Thank you!" (student, amount, school, receipt no, balance) | ⬜ |

| B10 | Mobile: `cd apps/mobile`, `npx eas login`, `npx eas init`, then set `EAS_PROJECT_ID`. Add the Firebase web config to EAS for each profile: `npx eas env:create` for every `EXPO_PUBLIC_FIREBASE_*` value, plus `GOOGLE_SERVICES_JSON` as a file variable (download `google-services.json` from Firebase → Android app). Set `EXPO_PUBLIC_ADMIN_URL`. Full guide: `apps/mobile/README.md` | ⬜ |
| B11 | Push notifications: `npx eas credentials` → Android → upload the **FCM v1** service-account key (iOS later: APNs). Test push on a development build: `npx eas build -p android --profile development` (doesn't work in Expo Go) | ⬜ |
| B12 | White-label app for a school (e.g. Prince): build with `EXPO_PUBLIC_SCHOOL_ID=<schoolId>`, `EXPO_PUBLIC_APP_NAME="Prince Driving School"`, `APP_BUNDLE_ID=app.steerly.prince` and its own icon | ⬜ |

## C. Before going live

| # | Task | Status |
|---|---|---|
| C1 | Close VS Code/Expo, then rename the folder `prince-driving-school-app` → `steerly`. Moving it out of OneDrive (e.g. `C:\dev\steerly`) makes installs ~5× faster | ⬜ |
| C2 | *(Optional)* A Steerly logo, app icons, splash and share image are already made (`scripts/brand/src/*.svg`). To use your own designer's logo: replace `mark.svg`, `mark-mono.svg`, `app-icon.svg` (64×64 box, centred), then run `npm run brand` | ⬜ |
| C3 | Review the Privacy Policy & Terms pages on the website with a lawyer (DPDP Act 2023) | ⬜ |
| C4 | Create Prince Driving School as the first school (sign up in the admin, add courses, instructors, vehicles) | ⬜ |
| C5 | Build the Android app: `cd apps/mobile && npx eas build -p android --profile production`, upload to Play Console internal testing | ⬜ |
| C6 | Deploy admin + website to Firebase Hosting: `npm run build:admin && npm run build -w steerly-web && firebase deploy --only hosting` | ⬜ |
| C7 | Switch Razorpay to Live keys + set `OTP_DEV_MODE=false` in `functions/.env.steerly-prod` | ⬜ |

## D. Decisions & content only you can provide

| # | Task | Status |
|---|---|---|
| D1 | **Razorpay setup (talk to Razorpay / a CA):** today all student fees go through ONE Steerly Razorpay account, then you'd pay schools out. That can make you a "payment aggregator" under RBI rules. The usual fix is **Razorpay Route** (each school gets its own linked account). Tell Claude which way to go | ⬜ |
| D2 | Final domain: `steerly.app` is used as a placeholder in `apps/web/index.html`, `public/robots.txt`, `public/sitemap.xml` and the admin share link. Search-replace once you own a domain | ⬜ |
| D3 | Fill the `[brackets]` in `apps/web/src/pages/legal/LegalLayout.tsx`: company name & address, grievance officer, retention periods, city for jurisdiction | ⬜ |
| D4 | Create real mailboxes: hello@, privacy@, grievance@ your domain | ⬜ |
| D5 | Confirm the promises in the website copy: 90-day data retention after cancellation, 30-day deletion, "call back within one working day", help importing spreadsheets | ⬜ |
| D6 | ~~Social share image~~ — done by Claude (`apps/web/public/og.png`) | ✅ |
| D7 | After publishing: put the Play Store link in `VITE_PLAY_STORE_URL` and the live admin URL in `VITE_ADMIN_URL` (`apps/web/.env.local`) | ⬜ |

---

_Last updated by Claude (2026-10-23): everything buildable without your accounts is done and committed on branch `build/phases-1-6`. The remaining items above need your accounts, money, legal review or decisions._
