# Running Steerly on the free Firebase plan (Spark)

This guide sets up a real Firebase project **without a credit card**. Checked against Firebase's pricing pages on 29 Oct 2026.

> ### Your progress: project `steerly-dev-d74dd` (updated 2 Nov 2026)
> | Step | Status |
> |---|---|
> | 1 Create project | ✅ done (`steerly-dev`, ID `steerly-dev-d74dd`, Spark plan) |
> | 2 Register web app | ✅ done |
> | 3 Email/Password sign-in | ✅ done |
> | 4 Firestore database | ✅ done. Double-check the location under Firestore → Settings: it should be **asia-south1** |
> | 5 Config in the apps | ✅ done: Claude converted your pasted config into the three `.env.local` files |
> | 6 CLI connected | ⏳ `.firebaserc` already points at `steerly-dev-d74dd`, so just run `npx firebase login` |
> | 7 Deploy rules | ⏳ **next**: `npx firebase deploy --only firestore` |
> | 8 Create school + owner | ⏳ `npm run create-school …` |
> | 9 Run it | ⏳ `npm run admin` (**not** `admin:emulator`) |
> | 10–11 Hosting, lock old project | ⏳ |
>
> See **Troubleshooting** at the end of section 2 for the errors you hit and what caused them.

## 1. What works for free and what doesn't

The free **Spark** plan includes **Firestore, Authentication and Hosting**.
**Cloud Functions** and, since 3 Feb 2026, **Cloud Storage** need the paid **Blaze** plan.

| Feature | Free plan | Why |
|---|---|---|
| Website + public school page `/s/<school>` | ✅ | Hosting + Firestore |
| Online enquiry form (website and app) | ✅ | Writes straight to Firestore |
| Admin dashboard: email login | ✅ | Authentication |
| Leads CRM: add, edit status/notes/follow-ups, call/WhatsApp | ✅ | Firestore |
| Courses, vehicles, branches, school settings | ✅ | Firestore |
| Mobile app: browse courses + enquire | ✅ | Firestore |
| Creating a school | ✅ via a script on your laptop (`npm run create-school`) | Admin SDK works on any plan |
| Phone OTP login (mobile and dashboard) | ❌ | Cloud Functions |
| Converting leads to students, adding students | ❌ | Cloud Functions |
| Slot booking, lessons, instructor app | ❌ | Cloud Functions |
| Payments, receipts, reminders, reports, WhatsApp | ❌ | Cloud Functions |
| Logo upload, student documents | ❌ | Cloud Storage |

With `VITE_FUNCTIONS_ENABLED=false`, the ❌ buttons in the dashboard show *"This feature needs Cloud Functions, which require the Firebase Blaze plan"* instead of failing. The mobile app's Log in shows *"Login and booking are not switched on for this school yet."*

So the free plan gives you a **lead-capture + CRM pilot**: what Prince Driving School started with, on the new design. It's a good way to start selling before you pay anything.

**Free limits** (per project): Firestore 1 GiB stored, 50,000 reads/day, 20,000 writes/day; Auth 50,000 monthly users; Hosting 10 GB stored, 360 MB/day transfer. One busy school uses a small fraction of this.

---

## 2. Step by step

Do this once. It takes about 30 minutes. All commands run in PowerShell from the project folder.

### Step 1 — Create the Firebase project
1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name: `steerly-dev`. Firebase shows the project ID under the name; **write it down** (e.g. `steerly-dev` or `steerly-dev-1a2b3`).
4. Google Analytics: turn it **off** for now (you can add it later), then **Create project**.
5. You're on the **Spark (no-cost)** plan. If Firebase ever asks you to "Upgrade", click **Cancel**.

### Step 2 — Register the web app and copy its config
1. On the project home page, click the **web icon `</>`**.
2. Nickname: `steerly-web`. Leave "Firebase Hosting" unticked. Click **Register app**.
3. Firebase shows a `firebaseConfig` block. Keep this tab open; you need these 6 values in Step 5:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
   (These are safe to put in a web app. They are not passwords; the security rules protect the data.)

### Step 3 — Turn on email sign-in
1. Left menu → **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → switch **Enable** on (leave "Email link" off) → **Save**.
3. **Settings** tab → **Authorized domains**: `localhost` is already there. Your hosting domains are added automatically in Step 9.

### Step 4 — Create the Firestore database
1. Left menu → **Build → Firestore Database → Create database**.
2. Edition: **Standard**.
3. Location: **asia-south1 (Mumbai)**. ⚠ This can never be changed later.
4. Start in **production mode** → **Create**. (Production mode blocks everything until Step 7 deploys Steerly's own rules.)

### Step 5 — Put the config into the apps
Copy each example file, then fill in the 6 values from Step 2.

> ⚠ **Don't paste the JavaScript snippet Firebase shows you** (`import { initializeApp } …`, `const firebaseConfig = { apiKey: "…" }`) into `.env.local`. These files take one `NAME=value` per line, with no quotes, commas or code. Convert each line like this:
>
> | In Firebase's snippet | Line in `appsdmin\.env.local` / `apps\web\.env.local` | Line in `apps\mobile\.env.local` |
> |---|---|---|
> | `apiKey: "AIza…"` | `VITE_FIREBASE_API_KEY=AIza…` | `EXPO_PUBLIC_FIREBASE_API_KEY=AIza…` |
> | `authDomain: "x.firebaseapp.com"` | `VITE_FIREBASE_AUTH_DOMAIN=x.firebaseapp.com` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=…` |
> | `projectId: "x"` | `VITE_FIREBASE_PROJECT_ID=x` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID=…` |
> | `storageBucket: "x.firebasestorage.app"` | `VITE_FIREBASE_STORAGE_BUCKET=…` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=…` |
> | `messagingSenderId: "123"` | `VITE_FIREBASE_MESSAGING_SENDER_ID=123` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123` |
> | `appId: "1:123:web:abc"` | `VITE_FIREBASE_APP_ID=1:123:web:abc` | `EXPO_PUBLIC_FIREBASE_APP_ID=…` |
> | `measurementId: "G-…"` | not needed: Steerly doesn't use Google Analytics | not needed |

```powershell
Copy-Item apps\admin\.env.example apps\admin\.env.local -Force
Copy-Item apps\web\.env.example apps\web\.env.local -Force
Copy-Item apps\mobile\.env.example apps\mobile\.env.local -Force
```

`apps\admin\.env.local`:
```
VITE_FIREBASE_API_KEY=<apiKey>
VITE_FIREBASE_AUTH_DOMAIN=<authDomain>
VITE_FIREBASE_PROJECT_ID=<projectId>
VITE_FIREBASE_STORAGE_BUCKET=<storageBucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
VITE_FIREBASE_APP_ID=<appId>
VITE_APPCHECK_RECAPTCHA_SITE_KEY=
VITE_USE_EMULATORS=false
VITE_FUNCTIONS_ENABLED=false
VITE_PUBLIC_SITE_URL=http://localhost:5174
```

`apps\web\.env.local`: the same six `VITE_FIREBASE_*` lines, plus:
```
VITE_USE_EMULATORS=false
VITE_ADMIN_URL=http://localhost:5173
```

`apps\mobile\.env.local`: the same six values with the `EXPO_PUBLIC_` prefix instead of `VITE_`, plus:
```
EXPO_PUBLIC_FUNCTIONS_ENABLED=false
EXPO_PUBLIC_SCHOOL_ID=
```
(Fill `EXPO_PUBLIC_SCHOOL_ID` after Step 8.)

> If an `.env.local` already exists with the old `prince-driving-school` values, overwrite it. That old project is replaced by this one.

### Step 6 — Connect the Firebase CLI to the project
The CLI is already installed inside the project, so you run it with `npx firebase`.
```powershell
npx firebase login                 # opens the browser; sign in with the same Google account
npx firebase use                   # should print: Active Project: default (steerly-dev-d74dd)
```
`.firebaserc` already points `default` at `steerly-dev-d74dd`, and the old project is kept under the alias `old-prince` for Step 11. If you ever create another project, run `npx firebase use --add` and pick it.

### Step 7 — Deploy the security rules and indexes
```powershell
npx firebase deploy --only firestore
```
You should see `Deploy complete!`. Don't deploy `functions` or `storage`: both need Blaze, and the deploy would stop with a billing error.

### Step 8 — Create your school and owner login
1. Firebase console → ⚙ **Project settings → Service accounts → Generate new private key → Generate key**. A `.json` file downloads.
2. Move it **outside the project folder**, e.g. `C:\keys\steerly-dev-service-account.json`. It's a real secret: never commit it, never share it.
3. Run (with your own details):
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\steerly-dev-service-account.json"
   npm run create-school -- --name "Prince Driving School" --city Pune --phone 9876543210 --owner-name "Your Name" --owner-email you@example.com --address "Karve Road, Kothrud"
   ```
4. It prints the **School ID**, **join code**, **public page** path and a **"set your password" link**. Open the link, choose a password.
5. Put the School ID into `apps\mobile\.env.local` as `EXPO_PUBLIC_SCHOOL_ID=...`.
6. *(Optional)* Make yourself the platform super admin too:
   ```powershell
   npm run set-role -- you@example.com superAdmin
   ```
   Skip this if you want to stay a normal school owner. A super admin's school is chosen from the Platform page instead.

### Step 9 — Run it
First stop any dashboard that's already running (click its terminal, press **Ctrl + C**). Then:
```powershell
npm run admin      # dashboard → http://localhost:5173 → Email tab → sign in
npm run web        # website  → http://localhost:5174/s/<your-school-slug>
npm run mobile     # app → scan the QR code with Expo Go on your phone
```
- Use **`npm run admin`** for your real project. `npm run admin:emulator` is only for the offline demo (section 2b below) and talks to `127.0.0.1`, not Firebase.
- On the free plan, sign in on the **Email** tab with the owner created in Step 8. **Don't use "Start your free trial" / Sign up**: creating a school from the website needs Cloud Functions (Blaze). Step 8's script does the same job for free.
- Try it: submit an enquiry on the website or the app → it appears live in **Leads** on the dashboard.

### Troubleshooting (errors seen on 2 Nov 2026)
| What you see | Cause | Fix |
|---|---|---|
| Sign-up/login shows `auth/network-request-failed`; console shows `127.0.0.1:9099 … ERR_CONNECTION_REFUSED` | The dashboard was started with `npm run admin:emulator` (demo mode), but the emulators weren't running | For your real project: stop it and run `npm run admin`. For the offline demo: start `npm run emulators` first (section 2b) |
| Phone OTP shows "Server error" and `127.0.0.1:5001/…/requestOtp ERR_CONNECTION_REFUSED` | Same as above (demo mode without emulators) | Same as above. On the real free project, phone OTP shows a "needs the Blaze plan" message instead, as designed |
| `npm run emulators`: "firebase-tools no longer supports Java version before 21" | That terminal used the default Java 20 | Fixed: `npm run emulators` now finds Java 21 by itself (it was installed in `%LOCALAPPDATA%\Programs\jdk21`). Just run it again |
| `npm run seed`: "Firestore emulator not reachable at 127.0.0.1:8080" | Seed needs the emulators running | Run `npm run emulators` in one terminal, wait for "All emulators ready", then `npm run seed` in a second terminal |
| Dashboard error "Missing Firebase config" | `.env.local` has the JavaScript snippet instead of `NAME=value` lines | See the table in Step 5 |

### Optional: nicer emails
Authentication → **Templates** → **Password reset** (used by Step 8's "set your password" link) → ✏ → *Sender name* `Steerly` → Save. You can do the same for *Email address verification*.

### Step 10 — Put the dashboard and website online (free hosting)
1. Firebase console → **Build → Hosting → Get started** → click through to the end.
2. Hosting → **Add another site** twice: `steerly-admin-<something>` and `steerly-web-<something>` (names must be unique worldwide).
3. Link them to this project's deploy targets:
   ```powershell
   npx firebase target:apply hosting admin steerly-admin-<something>
   npx firebase target:apply hosting web steerly-web-<something>
   ```
4. In `apps\admin\.env.local` set `VITE_PUBLIC_SITE_URL=https://steerly-web-<something>.web.app`. In `apps\web\.env.local` set `VITE_ADMIN_URL=https://steerly-admin-<something>.web.app`.
5. Build and deploy:
   ```powershell
   npm run build:admin
   npm run build -w steerly-web
   npx firebase deploy --only hosting
   ```
6. Open `https://steerly-admin-<something>.web.app`, sign in with your email. Share `https://steerly-web-<something>.web.app/s/<your-school-slug>` with students.

### Step 11 — Lock the old `prince-driving-school` project
The original app used a different Firebase project, `prince-driving-school`, which was very likely left in "test mode" (anyone can read and write it, including the old customer enquiries and phone numbers).
- Not using it any more? Firebase console → that project → ⚙ **Project settings → General → Delete project**.
- Want to keep the data? Open its **Firestore → Rules**, replace everything with the block below, and **Publish**:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} { allow read, write: if false; }
    }
  }
  ```

---

## 2b. Offline demo on your laptop (no Firebase project needed)
Handy for showing the full product to a driving school, including logins, booking and payments, before you pay for Blaze. Everything runs locally against the fake project `demo-steerly`.
```powershell
npm run emulators        # terminal 1: leave it running until "All emulators ready"
npm run seed             # terminal 2: creates the demo Prince Driving School
npm run admin:emulator   # terminal 2: dashboard at http://localhost:5173
```
Log in with phone **9000000001**, OTP **123456** (owner). Instructors 9000000002 / 9000000003, students 9000000011…9000000022. The demo data disappears when you stop the emulators.

---

## 3. Staying safely inside the free plan
- Firebase console → **Usage and billing** shows today's Firestore reads/writes. Without a card, Firebase **stops** a service for the rest of the day when you hit a limit; it never charges you.
- The dashboard's live lists read data each time they open. A school with a few hundred leads is far below 50,000 reads a day.

## 4. When you're ready for logins, booking and payments (Blaze)
Blaze keeps the same free allowance (e.g. Cloud Functions: 2 million calls a month free) and charges only for use above it. A pilot school usually costs ₹0.
1. Firebase console → **Upgrade** → **Blaze** → add a card.
2. Right away, set a **budget alert**: Google Cloud console → **Billing → Budgets & alerts → Create budget**, ₹200/month, emails at 50% / 90% / 100%. (A budget only sends alerts; it doesn't cap spending.)
3. Set `VITE_FUNCTIONS_ENABLED=true` and `EXPO_PUBLIC_FUNCTIONS_ENABLED=true`.
4. Continue with section **B** of [USER_TODO.md](../USER_TODO.md): secrets, `npx firebase deploy --only firestore,storage,functions`, Razorpay webhook, and so on.
