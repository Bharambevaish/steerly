# Steerly — Driving School Management Suite

Steerly is a white-label platform for driving schools: a mobile app for students and instructors and a web dashboard for school owners and staff. Both share one Firebase backend. See [PLAN.md](PLAN.md) for the roadmap.

## Repository layout

```
steerly/                    npm workspaces monorepo
├── apps/
│   ├── mobile/             Expo Router app for students + instructors — package: steerly-student
│   ├── admin/              React + Vite + Tailwind school dashboard + super-admin — package: steerly-admin
│   └── web/                Marketing site, public school pages, legal pages — package: steerly-web
├── packages/
│   └── shared/             @steerly/shared: types, Zod schemas, roles, collection names
├── functions/              Firebase Cloud Functions (OTP, booking, payments, receipts, reminders) — see functions/README.md
├── scripts/set-role.mjs    Give a user an admin role (custom claim)
├── firestore.rules         Firestore security rules
├── storage.rules           Storage security rules
└── firebase.json           Firebase CLI config (rules, hosting, emulators)
```

## First-time setup

```bash
npm install
```

Create the env files (they are git-ignored) from the examples and fill in the values from Firebase console → Project settings → Your apps → Web app:

- `apps/admin/.env.example` → `apps/admin/.env.local`
- `apps/mobile/.env.example` → `apps/mobile/.env.local`
- `apps/web/.env.example` → `apps/web/.env.local`
- `functions/.env.example` → `functions/.env.<projectId>`

**Everything you need to set up is in [USER_TODO.md](USER_TODO.md).** Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run

```bash
npm run admin       # dashboard at http://localhost:5173
npm run mobile      # Expo dev server; scan the QR code with Expo Go
npm run web         # website at http://localhost:5174
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:admin`, `npm run build:functions`.

Note: typed routes are off in `apps/mobile/app.json` because npm keeps `expo-router` inside `apps/mobile/node_modules` in this workspace layout; the app runs and bundles normally.

## Test everything locally (Firebase emulators)

Needs **Java 21+** (`java -version`). No Firebase account needed: the emulators use the offline demo project `demo-steerly`.

1. One time: `functions/.env.local` and `functions/.secret.local` hold dev values (see `functions/README.md`). OTPs are shown on screen instead of sent by SMS.
2. Terminal 1:
   ```powershell
   $env:FUNCTIONS_DISCOVERY_TIMEOUT=60   # OneDrive makes the first load slow
   npm run emulators                     # UI at http://127.0.0.1:4000
   ```
3. Terminal 2: `npm run e2e` runs the 48-step end-to-end test (onboarding → leads → students → booking → lessons → payments + webhook → reports → account deletion → multi-school isolation).
4. Optional: `npm run admin:emulator` opens the dashboard against the emulators; sign in with any phone number and the code shown on screen. After `npm run e2e`, the owner of the test school is `91<run id>000`, e.g. run `08129` → `9108129000`.

## Admin access

The dashboard only lets in users whose Firebase Auth token has `role` = `superAdmin`, `owner` or `staff`.

1. Firebase console → Authentication → Sign-in method → enable **Email/Password**.
2. Authentication → Users → **Add user** (email + password).
3. Project settings → Service accounts → **Generate new private key**. Save it outside this repo.
4. Give the user a role:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\steerly-service-account.json"
   npm run set-role -- owner@example.com owner
   ```
5. Sign in at `/login`.

## Deploy security rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

The rules allow anyone to submit a valid enquiry, and only admins to read or update enquiries. Everything else is closed.
