# Steerly — Project Completion Plan

**Steerly** is a white-label driving school management platform: a mobile app for students and instructors, and a web dashboard for school owners. You sell it to many driving schools. Prince Driving School is the first customer (tenant #1), not the product name.

---

## 1. Where the project is today

| Part | What exists | State |
|---|---|---|
| `customer-app/` (Expo 57, React Native 0.86, TS) | One screen: enquiry form (name, phone, course, time) that writes to Firestore `enquiries` | ~10% |
| `admin-dashboard/` (React 19, Vite 8, Tailwind 3, TS) | One screen: live enquiry list with New / Contacted / Enrolled status | ~10% |
| Backend (Firebase) | Auth + Firestore set up in code; Auth is never used | ~5% |

Overall it is a working **lead-capture demo**, not a product yet.

### Problems found in the review

**Critical (fix before anyone else uses it)**
1. **The admin dashboard has no login.** Anyone who opens the URL can read every customer's name and phone number and change their status.
2. **No Firestore security rules in the repo.** The database is most likely in "test mode", which means anyone with the API key (it ships inside the app) can read or delete all data.
3. **No git repository.** No history, no backup, no way to undo.

**Important**
4. Firebase config is copy-pasted in 3 places (`customer-app/firebase.js`, `admin-dashboard/src/firebase.js`, `SDKs -or-the-products.txt`). Move it to `.env` files and delete the `.txt` file.
5. The Firebase project is called `prince-driving-school`. Project IDs can't be renamed, so the product needs a new project (`steerly-dev` and `steerly-prod`).
6. Single-tenant design: one flat `enquiries` collection. To sell to many schools every record must belong to a school (`schoolId`).
7. Courses and time slots are hard-coded in the app.
8. Each app is a single big `App.tsx` with no navigation, folders or shared types.
9. `SafeAreaView` from `react-native` is deprecated (Metro warns about it). Use `react-native-safe-area-context`.
10. `app.json` has no `ios.bundleIdentifier` / `android.package`, so it can't go to the stores yet.

**Fixed already in this pass**
- `justifyContent: 'between'` → `'space-between'` in `customer-app/App.tsx` (it was an invalid value, so the dropdown arrow wasn't aligned).
- All "Prince Driving School" branding → **Steerly** (UI text, logo letter, package names, Expo app name/slug, page title, README).

---

## 2. Tech stack decision

**Decision: keep React Native (Expo) + React + Firebase. Don't switch to Flutter.**

Flutter is a very good framework, but for this product it is the worse choice:

| Factor | Expo + React (current) | Flutter |
|---|---|---|
| Languages across the whole product | **One: TypeScript** (mobile, admin web, Cloud Functions) | Dart for the app + TypeScript/JS for Cloud Functions + something for the admin |
| Admin dashboard (tables, filters, reports, invoices) | React web is the strongest option | Flutter Web is heavy and weak for data-heavy dashboards |
| Share types and validation between app, admin and backend | Yes, one `packages/shared` folder | No |
| Ship bug fixes without store review (important when 20 schools use your app) | **EAS Update, built in** | Needs Shorebird (paid add-on) |
| White-label builds (each school gets its own app name and icon) | `app.config.ts` + EAS build profiles | Flavors, more manual setup |
| Work already done | Kept | Rewrite the mobile app |

Switch to Flutter only if you personally know Dart much better than React. Otherwise, one language everywhere is the biggest speed advantage a solo developer can have.

**Backend: keep Firebase**, because it gives phone OTP login (what Indian users expect), push notifications (FCM), file storage and a real-time database in one place. Add **Cloud Functions** for anything that must be trusted: booking slots, payments, roles.

### Final stack

```
steerly/                          (monorepo, npm workspaces)
├── apps/
│   ├── mobile/      Expo SDK 57 + Expo Router + TypeScript   → students AND instructors (role-based)
│   └── admin/       React 19 + Vite + Tailwind + TanStack Query + React Router → school owners & staff
├── packages/
│   └── shared/      Types, Zod schemas, constants, Firestore paths
├── functions/       Firebase Cloud Functions (TypeScript)
├── firestore.rules
├── storage.rules
└── firebase.json
```

Extra libraries: **Zod** (validation), **React Hook Form** (forms), **TanStack Query** (data), **Razorpay** (payments: UPI, cards), **Sentry** (crash reports), **Firebase App Check** (blocks fake clients).

---

## 3. Users and data model

**Roles** (stored as Firebase Auth custom claims): `superAdmin` (you, Steerly owner) · `owner` · `staff` · `instructor` · `student`

```
schools/{schoolId}                 name, logo, colors, phone, address, plan, status
schools/{schoolId}/branches/{id}
schools/{schoolId}/courses/{id}    name, sessions, durationMin, price, vehicleType
schools/{schoolId}/enquiries/{id}  name, phone, courseId, preferredTime, status, source, notes
schools/{schoolId}/students/{id}   userId, name, phone, courseId, instructorId, llStatus, dlStatus
schools/{schoolId}/instructors/{id}
schools/{schoolId}/vehicles/{id}   number, type (manual/auto/2W), insuranceExpiry, pucExpiry
schools/{schoolId}/slots/{id}      instructorId, vehicleId, start, end, status
schools/{schoolId}/bookings/{id}   studentId, slotId, status, attendance, instructorNotes, skillsCovered
schools/{schoolId}/payments/{id}   studentId, amount, method, razorpayId, receiptNo
users/{uid}                        name, phone, schoolId, role
```

Security rules: a user can only read/write data where `schoolId` matches their claim, and only what their role allows.

---

## 4. Phases

Estimated times are for one developer working full-time.

### Phase 0 — Foundation & security (1 week)
- [ ] `git init`, push to a private GitHub repo
- [ ] Rename the folder to `steerly`, convert to the monorepo layout above
- [ ] Create Firebase projects `steerly-dev` and `steerly-prod`; move config to `.env`; delete `SDKs -or-the-products.txt`
- [ ] Write `firestore.rules` + `storage.rules` and deploy them (close the open database)
- [ ] Admin login (email + password) and route protection
- [ ] Enable App Check
- [ ] Shared package with the types and Zod schemas
- [ ] Set `android.package` / `ios.bundleIdentifier` (e.g. `app.steerly.student`)

**Done when:** nobody can read data without logging in, and both apps run from the monorepo.

### Phase 1 — Multi-school core + Admin MVP (2–3 weeks)
- [ ] Multi-tenant data model (`schools/{schoolId}/...`), roles through custom claims (Cloud Function)
- [ ] Admin layout: sidebar, dashboard home with key numbers (new leads, active students, today's lessons, money collected this month)
- [ ] **Leads CRM:** the current enquiries screen + search, notes, follow-up date, "Convert to student"
- [ ] **Students:** list, profile, assigned course and instructor, LL/DL status
- [ ] **Courses**, **Instructors**, **Vehicles** (with insurance / PUC expiry reminders): add, edit, delete
- [ ] **School settings:** name, logo, brand color, contact info, branches
- [ ] Invite staff and instructors by phone number

**Done when:** Prince Driving School can run its daily office work from the dashboard.

### Phase 2 — Student app MVP (3 weeks)
- [ ] Expo Router navigation, new UI design (Gen-Z feel: bold type, rounded cards, dark/light themes)
- [ ] Phone OTP login; join a school with a school code or invite link
- [ ] Before enrolling: browse courses and prices, send an enquiry (existing form, now reading courses from Firestore)
- [ ] After enrolling: home screen with next lesson, progress ring, payments due
- [ ] Lesson history with instructor notes
- [ ] Skills checklist (steering, clutch control, reversing, parking, highway, …)
- [ ] Profile and documents section

**Done when:** a real student can log in, see their course and progress, and enquire.

### Phase 3 — Scheduling & instructor mode (2–3 weeks)
- [ ] Admin: set instructor availability and create slots (weekly repeating pattern)
- [ ] Student: book, cancel and reschedule lessons (rules: max per day, cancel at least X hours before)
- [ ] Booking runs in a Cloud Function **transaction**, so two students can never get the same slot
- [ ] Instructor mode in the same mobile app: today's schedule, call the student, mark attendance, tick skills covered, write notes
- [ ] Admin calendar view per instructor and per vehicle

**Done when:** lessons are booked and tracked without any phone calls or paper.

### Phase 4 — Payments & documents (2 weeks)
- [ ] Razorpay: pay full amount or in installments (UPI, card, netbanking)
- [ ] Payment webhook → Cloud Function → mark as paid (never trust the client)
- [ ] Record cash payments from the admin
- [ ] PDF receipts and GST invoices
- [ ] Document upload (photo, address proof) to Firebase Storage with strict access rules
- [ ] LL / DL test date tracking and reminders

**Done when:** the school collects fees and gives receipts inside Steerly.

### Phase 5 — Notifications & growth (1–2 weeks)
- [ ] Push notifications (FCM): lesson reminders, payment due, test date, new lead alert for the admin
- [ ] WhatsApp messages through a provider (Interakt / Gupshup / AiSensy)
- [ ] Reports: revenue, lead conversion rate, instructor utilisation; CSV export
- [ ] Ratings after lessons, referral codes

### Phase 6 — Productise & sell (2 weeks)
- [ ] **Super-admin console** (you): create schools, plans, usage, suspend unpaid accounts
- [ ] Self-serve onboarding for a new school (signup → setup wizard → school code)
- [ ] Steerly subscription billing (Razorpay Subscriptions), e.g. Starter / Pro / White-label tiers
- [ ] White-label builds with EAS: each Pro school can get its own app name, icon and colors
- [ ] Landing website + demo video
- [ ] Privacy policy and terms (India DPDP Act 2023), data deletion request flow
- [ ] Sentry, analytics, automated tests for booking and payment functions
- [ ] Publish to the Play Store (then the App Store)

**Done when:** a new driving school can sign up and pay for Steerly without you doing anything by hand.

---

## 5. Summary timeline

| Phase | Weeks | Result |
|---|---|---|
| 0 Foundation & security | 1 | Safe, organised codebase |
| 1 Admin MVP | 2–3 | School runs its office in Steerly |
| 2 Student app MVP | 3 | Students use the app |
| 3 Scheduling + instructors | 2–3 | Booking without calls |
| 4 Payments + documents | 2 | Fees collected in the app |
| 5 Notifications + reports | 1–2 | Engagement and insight |
| 6 Productise + launch | 2 | Ready to sell |
| **Total** | **~13–16 weeks** | |

**Milestone to aim for:** after Phase 3 (~8 weeks), Prince Driving School runs on Steerly as a pilot. Use that as your case study when you sell to other schools.
