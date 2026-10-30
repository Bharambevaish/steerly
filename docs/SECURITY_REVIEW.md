# Steerly security review — OWASP Top 10 (2025)

Date: 2026-10-29 · Scope: public website (`apps/web`), admin dashboard (`apps/admin`), Cloud Functions (`functions`), Firestore/Storage rules, hosting config, dependencies. The mobile app was reviewed where it shares code with these.

Method: manual code review of every callable function, both rule files and all URL/HTML sinks; `npm audit` of production dependencies; end-to-end test suite (58 steps, including cross-school and cross-user access) re-run after the fixes.

**Status column:** ✅ fixed in this review · 📝 documented / accepted risk · 👤 needs a setting only you can change.

## Summary

| ID | Severity | OWASP 2025 | Finding | Status |
|---|---|---|---|---|
| H1 | **High** | A07 Authentication Failures / A02 Misconfiguration | `OTP_DEV_MODE=true` on a live project returns the OTP to the caller → anyone can log in as any phone number. `functions/.env.example` shipped with it set to `true`. | ✅ |
| H2 | **High** | A06 Insecure Design | OTP limits were per phone number only → an attacker can request OTPs for thousands of numbers ("SMS pumping") and run up your MSG91 bill. | ✅ |
| M1 | Medium | A05 Injection | CSV formula injection: a public enquiry named `=HYPERLINK(...)` / `=cmd\|...` runs as a formula when staff open the leads export in Excel. | ✅ |
| M2 | Medium | A02 Security Misconfiguration | No security headers on either site: no CSP, no clickjacking protection, no `nosniff`, referrer or permissions policy. | ✅ |
| M3 | Medium | A01 Broken Access Control | School profile/settings written by owners were not validated: `logoUrl` could be any URL (tracking pixels, odd schemes on the public page), `brandColor` any string, settings any type/size, which could break bookings or receipts. | ✅ |
| M4 | Medium | A03 Supply Chain Failures | 10 high-severity advisories in production dependencies (body-parser, node-forge, re2js, @grpc/grpc-js, …). | ✅ 7 fixed · 📝 rest are Expo build tools |
| M5 | Medium | A09 Logging & Alerting Failures | No record of failed/locked OTPs, rate-limit hits, access denials, role changes, suspensions or account deletions, so attacks were invisible. | ✅ + 👤 alerts |
| L1 | Low | A01 Broken Access Control | Inviting the phone of an existing user who has no school attached them instantly, without their consent. | ✅ |
| L2 | Low | A01 / A08 | Student document records could point at another student's file path; `type` was free text. | ✅ |
| L3 | Low | A05 Injection (stored XSS) | Uploads accepted any `image/*`, including SVG, which can carry script when opened directly. | ✅ |
| L4 | Low | A01 | Receipt/document/billing tabs opened with `window.open` kept a link back to the dashboard (reverse tabnabbing). | ✅ |
| L5 | Low | A05 / A06 | Lead names, notes, preferred time and follow-up dates had no type/size limits on admin writes; public names could start with formula characters. | ✅ |
| L6 | Low | A06 Insecure Design | Public enquiry form has no server-side rate limit (Firestore rules can't count). | ✅ partly (honeypot + name rules) · 👤 App Check |
| L7 | Low | A07 | A deactivated staff member keeps access until their sign-in token expires (≤ 1 hour). | 📝 |
| L8 | Info | A01 | The public school document also exposes `ownerUid` and the Razorpay subscription id. Not sensitive on their own. | 📝 |
| L9 | Info | A07 | Firebase Auth password policy and email-enumeration protection are console settings. | 👤 |
| L10 | Info | A08 Data Integrity | GitHub Actions are pinned to version tags, not commit hashes. | ✅ Dependabot added |

**What was already solid** (verified, no change needed):
- **A01:** schools can't see each other's data, and students and instructors only see their own (proven by the end-to-end test). Every callable checks ownership (bookings, ratings, receipts, payment links). Money fields are server-only.
- **A04 Cryptographic Failures:** OTPs use a secure random generator, are stored salted and hashed, compared in constant time, expire after 5 minutes and lock after 5 attempts. The Razorpay webhook uses a constant-time HMAC check and is idempotent. Receipts use 15-minute signed URLs. No secrets in the git history.
- **A05 Injection:** no `dangerouslySetInnerHTML`/`eval`; React escapes all text; Firestore queries are parameterized.
- **A10 Exceptional Conditions:** unexpected errors are logged and hidden from callers. The webhook returns 500 so Razorpay retries. Scheduled jobs isolate failures per school and per booking. Access rules deny by default.

---

## Details and fixes

### H1 — OTP dev mode could bypass login (A07, A02)
**Risk:** with `OTP_DEV_MODE=true` the `requestOtp` function returns the code in its response (useful on the emulator). If that setting ever reached the live project, anyone could request a code for **any** phone number and read it, giving full account takeover of owners, staff and students. The example env file had it set to `true`, so copying it was enough.
**Fix:**
- Dev mode is now honoured **only inside the Firebase emulator** (`FUNCTIONS_EMULATOR === 'true'`). On a deployed project it is ignored, and a security event is logged if it's set.
- `functions/.env.example` now defaults to `false`.
- Test numbers (`OTP_TEST_NUMBERS`, fixed OTP 123456) remain for Play Store reviewers. Keep that list to numbers you own, and only accounts with no real data.

### H2 — SMS pumping (A06)
**Risk:** each new phone number got its own limits (1 SMS per 30 s, 5 per hour), so a script could cycle through thousands of numbers. That's a common toll-fraud attack, and you pay per SMS.
**Fix:**
- **Per-IP limit:** `OTP_MAX_PER_IP_HOUR` (default 20) OTP SMS per hour per client IP, keyed by a salted hash (raw IPs aren't stored). This is best effort: Indian mobile networks put many users behind one IP, and IPs can be rotated, so the **daily cap is the hard limit**.
- **Global daily cap:** `OTP_DAILY_CAP` (default 1000 SMS per day for the whole platform). Above it, OTP requests are refused and a security event is logged, so you can raise the cap if it's real growth.
- **App Check:** setting `ENFORCE_APP_CHECK=true` makes every callable reject requests that don't come from your real web app. Turn it on once the dashboard has a reCAPTCHA key (USER_TODO B8). The mobile app uses the Firebase JS SDK, which can't produce App Check tokens on Android/iOS, so only turn this on when mobile users don't need to log in, or after moving mobile to `@react-native-firebase`.

### M1 — CSV formula injection (A05)
**Fix:** CSV export now prefixes any cell starting with `=`, `+`, `-`, `@`, tab or carriage return with `'`, so Excel and Sheets show it as text. Defence in depth: names starting with those characters are now rejected for public enquiries, both by the shared form validation and by the Firestore rules.

### M2 — Security headers (A02)
**Fix:** `firebase.json` now sends these on both sites:
- `Content-Security-Policy`:
  - scripts from the site itself only, plus Google reCAPTCHA (needed for App Check);
  - connections to Firebase/Google APIs only;
  - images from the site, `data:`/`blob:` and Firebase Storage;
  - Google Fonts on the website;
  - `frame-ancestors 'none'` (blocks clickjacking), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `Strict-Transport-Security` (1 year, subdomains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, location, payment off), `Cross-Origin-Opener-Policy`.
- Long cache for hashed assets, no-cache for `index.html` so updates reach users immediately.

Verified by serving the production builds with these exact headers and loading them in a browser (see Verification below). Note: the Firebase Hosting *emulator* ignores custom headers, but live Firebase Hosting applies them.

### M3 — Unvalidated school profile/settings (A01)
**Fix:** owner updates to `schools/{id}` are now checked in the rules:
- `name` 2–80 characters; `brandColor` must be `#RRGGBB`.
- `logoUrl` must be `null` or a Firebase Storage `https://` URL for this project.
- `phone` must be 10 digits; `email`, `address`, `city` have length limits.
- `settings` must have exactly the known keys, with numbers in the same ranges the Settings page allows (lesson 15–240 min, cancel window 0–168 h, 1–10 bookings a day, booking window 1–90 days, GST 0 or 18 %, receipt prefix 2–6 letters/digits) and strings length-limited.

### M4 — Vulnerable dependencies (A03)
**Fix:**
- `npm audit fix` updated body-parser, node-forge, re2js, fast-uri, uuid and xcode.
- An `overrides` entry forces Firebase's nested `@grpc/grpc-js` from 1.9 to 1.14.7 (patched).
- High-severity advisories in production dependencies went from 10 to 3.

**Remaining (accepted for now):** `zod@3` (inside `@expo/cli`), `deepmerge`, and `decode-uri-component`/`query-string` (inside expo-router). The first two only run on your laptop at build time. The last parses deep links in the app (the worst case is the app freezing on a malicious link). All are fixed by upgrading to **Expo SDK 58**; plan that as its own task.

**Prevention:** `.github/dependabot.yml` now opens weekly update PRs for npm packages and GitHub Actions.

### M5 — Security logging (A09)
**Fix:** a `securityEvent()` helper writes structured `security_event` log entries to Cloud Logging. Phone numbers are masked to their last 4 digits. Events logged:
- `otp_wrong`, `otp_locked`, `otp_rate_limited_phone`, `otp_rate_limited_ip`, `otp_daily_cap_reached`, `otp_dev_mode_ignored`
- `permission_denied` (from every role check)
- `claims_changed` (any role/school change)
- `member_invited`, `member_updated`, `school_status_changed`, `account_deleted`
- `webhook_bad_signature`

👤 **Your step:** Google Cloud console → Logging → Log-based alerts. Create one alert on `jsonPayload.security_event="otp_daily_cap_reached"` and another on more than 20 `permission_denied` events in 5 minutes, both emailing you. Exact filters are in USER_TODO B13.

### L1 — Invites attached existing users without consent (A01)
**Fix:** if the phone belongs to an existing user who isn't in this school, an **invite** is created instead. They join the next time they sign in, the same as new numbers. Re-adding a deactivated member of the *same* school still works instantly.

### L2 — Student document records (A01/A08)
**Fix:** rules now require `storagePath` to start with that student's own folder (`schools/{school}/students/{student}/`). `type` must be one of the known document types, `fileName` 1–200 characters, `contentType` an allowed image type or PDF.

### L3 — SVG uploads (A05)
**Fix:** Storage rules now accept only `image/jpeg`, `image/png`, `image/webp`, `image/heic` (+ `application/pdf` for documents). SVG is rejected.

### L4 — Reverse tabnabbing (A01)
**Fix:** tabs opened by the dashboard now set `opener = null` before navigating.

### L5 — Lead field limits (A05/A06)
**Fix:**
- Admin-created and edited leads must now have `preferredTime` from the fixed list, `notes` ≤ 2000 characters, and `followUpAt` either `null` or a timestamp.
- Public names may not start with formula characters.

### L6 — Enquiry spam (A06)
Firestore rules can't count requests, so a determined bot can still fill a school's lead list. Already in place: the hidden honeypot field on the website, strict field validation, and suspended schools reject enquiries. 👤 For real protection, turn on **App Check** for Firestore (reCAPTCHA on the website). Steps are in USER_TODO B8.

### L7 — Deactivated staff token lifetime (A07)
When an owner deactivates someone, their role is removed and their refresh tokens revoked immediately, but a token already issued can be used for up to an hour. That's standard for Firebase; accepted. For an urgent removal, also disable the user in Firebase console → Authentication.

### L8 — Public school document fields (A01)
`ownerUid` and `subscription.razorpaySubscriptionId` are readable by anyone who knows the school id. Neither grants access to anything. Accepted; revisit if a public/private profile split is ever needed.

### L9 — Auth console settings (A07) 👤
Firebase console → Authentication → Settings:
- **Password policy:** require at least 10 characters with mixed character types, enforced.
- **User account management:** keep **Email enumeration protection** on (default for new projects).

### L10 — CI pinning (A08)
Dependabot now proposes GitHub Actions updates weekly. Pinning actions to full commit SHAs is optional extra hardening.

---

## Verification

| Check | Result |
|---|---|
| Unit tests (functions), incl. new limiter, IP hashing and phone masking tests | 39/39 pass |
| End-to-end test on the emulators, incl. new security steps (M1, M3, L1, L2, L5) and every earlier access-control step | **63/63 pass** |
| Type checks (shared, functions, admin, web, mobile) and admin lint | clean |
| Production builds served with the exact `firebase.json` headers, checked in a browser | Website (landing + lazy pages, Google Fonts) and dashboard login load with **0 CSP violations**; framing the dashboard is **blocked** (`frame-ancestors 'none'`) |
| `npm audit --omit=dev` high-severity advisories | 10 → 3 (all in Expo build tooling) |

H1 can't be shown on the emulator, because the emulator is the one place dev mode is allowed. The code path is a single check of `FUNCTIONS_EMULATOR`, which Firebase sets only when running locally.
