import { Link } from 'react-router';
import { GRIEVANCE, LegalLayout, PRIVACY_EMAIL } from './LegalLayout';

const MAILTO = `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent('Account deletion request')}&body=${encodeURIComponent(
  'Please delete my Steerly account and associated data.\n\nRegistered mobile number: +91\nDriving school name:\nI am a (student / instructor / school owner):\n',
)}`;

export default function DeleteAccount() {
  return (
    <LegalLayout
      title="Delete your account"
      description="How to request deletion of your Steerly account and personal data, what is deleted, and what must be kept by law."
    >
      <p>
        This page explains how students, instructors and school owners using the <strong>Steerly</strong> app (including
        apps published under a driving school's own name, developed by Steerly) can ask for their account and personal
        data to be deleted.
      </p>

      <h2>How to request deletion</h2>
      <h3>Option 1 — in the app</h3>
      <ol>
        <li>Open the app and log in with your mobile number.</li>
        <li>Go to <strong>Profile → Settings → Delete account</strong>.</li>
        <li>Confirm the request. You will be logged out and your request will be sent to us and to your driving school.</li>
      </ol>
      <h3>Option 2 — by email (no app needed)</h3>
      <ol>
        <li>
          Email <a href={MAILTO}>{PRIVACY_EMAIL}</a> with the subject “Account deletion request”.
        </li>
        <li>Include your registered mobile number and the name of your driving school.</li>
        <li>We will verify the request by sending an OTP or calling your registered number.</li>
      </ol>
      <p>
        We confirm receipt within [48 hours] and complete deletion within <strong>[30] days</strong> of verification.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your login (phone number authentication) and user profile.</li>
        <li>Contact details: name, email, address, date of birth and photo.</li>
        <li>Uploaded identity documents (Aadhaar, licence copies, address proof, etc.).</li>
        <li>Lesson bookings, instructor notes, skill progress and push notification tokens.</li>
        <li>Enquiries you submitted.</li>
      </ul>

      <h2>What we must keep</h2>
      <p>Some records must be retained by law even after you delete your account:</p>
      <ul>
        <li>
          <strong>Payment and GST receipt records</strong> (amount, date, receipt number, name on the receipt) — kept for
          [8 years] under the Income-tax Act and GST law, then deleted.
        </li>
        <li>Records needed to resolve an open dispute or comply with a legal request, until it is resolved.</li>
      </ul>
      <p>
        Retained records are restricted from normal use. Backups containing deleted data are overwritten within [35
        days].
      </p>

      <h2>School owners</h2>
      <p>
        Deleting a <strong>school</strong> account removes the school and all its staff, instructor and student data
        after a [90]-day grace period, apart from records we must keep by law. Export your data from the dashboard first.
      </p>

      <h2>Questions</h2>
      <p>
        Contact our Grievance Officer at <a href={`mailto:${GRIEVANCE.email}`}>{GRIEVANCE.email}</a>. See our{' '}
        <Link to="/privacy">Privacy policy</Link> for your other rights.
      </p>
    </LegalLayout>
  );
}
