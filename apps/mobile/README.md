# Steerly mobile app (`steerly-student`)

Expo SDK 57 + Expo Router. One app with three modes chosen from the auth claims:
prospect (not signed in), student, instructor. Owners and staff with **Also teaches** turned on get the
instructor tabs too; other owners and staff see a "use the admin dashboard" screen.

## Local development

```bash
cp .env.example .env.local     # fill the EXPO_PUBLIC_FIREBASE_* values from Firebase console
npx expo start                 # a = Android emulator, w = web browser
npm run typecheck -w steerly-student   # from the repo root
```

### Against the Firebase emulators

```bash
npm run emulators                         # repo root: auth, firestore, functions, storage (demo-steerly)
cp .env.emulator.example .env.local       # back up your real .env.local first
npx expo start -c
```

`EXPO_PUBLIC_USE_EMULATORS=true` connects auth (9099), Firestore (8080), Functions (5001) and Storage (9199)
on `10.0.2.2` from the Android emulator and on `127.0.0.1` everywhere else. Set `EXPO_PUBLIC_EMULATOR_HOST`
to your PC's LAN IP for a physical phone. OTP codes appear in a "Dev mode" banner on the code screen.

### Web (testing only)

`npx expo start --web`, or a static build with `npx expo export --platform web` (output in `dist/`).
Sign-in persists in IndexedDB. Push notifications, haptics and the camera are turned off on web.
Calling a student opens a `tel:` link, and the documents screen uses the browser's file chooser.

## EAS builds

One-time setup (needs your Expo account):

```bash
npm i -g eas-cli
eas login
cd apps/mobile
eas init                 # creates the EAS project; copy the projectId into EAS_PROJECT_ID (or app.json extra.eas.projectId)
npx expo install expo-dev-client   # only needed for the development profile
```

Firebase config goes in **EAS environment variables**, not in git. Create each variable once per environment
(`development`, `preview`, `production`). Use "plain text" or "sensitive" visibility, since EXPO_PUBLIC_* values are bundled into the app anyway:

```bash
eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..." --visibility sensitive
# repeat for AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, and EAS_PROJECT_ID
```

| Profile | Command | Output |
|---|---|---|
| `development` | `eas build -p android --profile development` | Dev-client APK. Run `npx expo start --dev-client` and open it |
| `preview` | `eas build -p android --profile preview` | Installable APK for testers (internal distribution link) |
| `production` | `eas build -p android --profile production` | Play Store AAB. `versionCode` auto-increments remotely (`appVersionSource: remote`) |

Submit to Play (internal track, draft): `eas submit -p android --profile production`. The first upload
must be done by hand in Play Console. Then create a Google service-account key and add it with
`eas credentials`.

To bump the user-visible version, change `version` in `app.json`. EAS manages the build numbers.

## White-label build for a school

Every school app is the same code with different env vars (read by `app.config.ts`):

| Var | Example | Effect |
|---|---|---|
| `EXPO_PUBLIC_APP_NAME` | `Prince Driving School` | Name under the icon, in-app titles |
| `EXPO_PUBLIC_SCHOOL_ID` | `abc123` | Locks the app to that school (no school picker) |
| `APP_SLUG` | `steerly-prince` | EAS project slug (one EAS project per store listing) |
| `APP_BUNDLE_ID` | `app.steerly.prince` | Android package / iOS bundle id. **Can never change after the first Play upload** |
| `APP_SCHEME` | `princeds` | Deep-link scheme (defaults to the slug without dashes) |
| `EAS_PROJECT_ID` | `uuid` | EAS project of that slug (push tokens need it) |
| `EAS_OWNER` | `steerly` | Expo account/org owning the project (optional) |
| `APP_BRAND_COLOR` | `#1D4ED8` | Adaptive-icon background, notification accent, splash background, fallback theme colour |
| `APP_SPLASH_BG` | `#FFFFFF` | Splash background if it should differ from the brand colour |
| `APP_ICON` | `./branding/prince/icon.png` | 1024×1024 app icon. Also used as the adaptive foreground unless `APP_ADAPTIVE_ICON` is set |
| `APP_ADAPTIVE_ICON` | `./branding/prince/adaptive.png` | Android adaptive foreground (keep the logo inside the central 66%) |
| `APP_SPLASH_IMAGE` | `./branding/prince/splash.png` | Splash logo |

Recommended setup: add a profile per school to `eas.json` that extends `production`:

```jsonc
"prince": {
  "extends": "production",
  "env": {
    "EXPO_PUBLIC_APP_NAME": "Prince Driving School",
    "EXPO_PUBLIC_SCHOOL_ID": "<schoolId>",
    "APP_SLUG": "steerly-prince",
    "APP_BUNDLE_ID": "app.steerly.prince",
    "EAS_PROJECT_ID": "<uuid from eas init>",
    "APP_BRAND_COLOR": "#1D4ED8",
    "APP_ICON": "./branding/prince/icon.png"
  }
}
```

Then: `APP_SLUG=steerly-prince eas init` (once, creates the EAS project for that slug), then
`eas build -p android --profile prince`. Check the resolved config first with
`APP_SLUG=… APP_BUNDLE_ID=… npx expo config --type public`.

Because `EXPO_PUBLIC_*` values are inlined at build time, a white-label build always shows the school
it was built for. Its Firebase project is the shared Steerly one, so set the same Firebase variables on each EAS project.

## Push notification credentials

The backend sends through the Expo Push API using the `expoPushToken` saved on `users/{uid}`.

- **Android (FCM v1):** in the Firebase console, add an Android app with the build's package
  (`app.steerly.student` or the school's `APP_BUNDLE_ID`). Then go to Project settings, Service accounts,
  and generate a new private key. Upload the key with `eas credentials`, choosing Android, then
  production, then Google Service Account, then "Manage your FCM V1 key". Repeat for each white-label package.
- **google-services.json:** download it for that Android app and upload it as a *file* environment variable:
  `eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`.
  `app.config.ts` passes it to `android.googleServicesFile`. Without it, Android can't get a push token.
  Don't commit the file.
- **iOS (later):** `eas credentials`, then iOS, then Push Notifications. Let EAS create the APNs key.
- Tokens only register on a real device in a dev/preview/production build (not Expo Go, not web), and only
  when an EAS project id is configured.
