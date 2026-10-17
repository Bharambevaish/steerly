// Gives a Firebase Auth user a role (custom claim) so they can use the admin dashboard.
//
// Usage:
//   1. Firebase console → Project settings → Service accounts → Generate new private key.
//      Save it OUTSIDE this repo (it is a real secret).
//   2. set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json   (PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="...")
//   3. npm run set-role -- admin@example.com owner
//
// The user must sign out and back in (or wait up to 1 hour) for the new role to apply.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ROLES = ['superAdmin', 'owner', 'staff', 'instructor', 'student'];
const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Usage: npm run set-role -- <email> <${ROLES.join('|')}>`);
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });
console.log(`Set role "${role}" on ${email} (uid ${user.uid}).`);
