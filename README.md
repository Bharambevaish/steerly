# Steerly — Driving School Management Suite

Steerly is a white-label platform for driving schools: a mobile app for students and instructors and a web dashboard for school owners and staff. Both share one Firebase backend. See [PLAN.md](PLAN.md) for the roadmap.

## Repository layout

```
steerly/                    npm workspaces monorepo
├── apps/
│   ├── mobile/             Expo (React Native) app — package: steerly-student
│   └── admin/              React + Vite + Tailwind dashboard — package: steerly-admin
├── packages/
│   └── shared/             @steerly/shared: types, Zod schemas, roles, collection names
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

## Run

```bash
npm run admin       # dashboard at http://localhost:5173
npm run mobile      # Expo dev server; scan the QR code with Expo Go
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build:admin`.

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
