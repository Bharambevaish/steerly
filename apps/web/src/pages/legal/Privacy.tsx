import { Link } from 'react-router';
import { COMPANY, COMPANY_ADDRESS, GRIEVANCE, LegalLayout, PRIVACY_EMAIL } from './LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy policy"
      description="How Steerly collects, uses, stores and protects personal data of driving schools, instructors and students under India's Digital Personal Data Protection Act, 2023."
    >
      <p>
        This policy explains how {COMPANY} (“<strong>Steerly</strong>”, “we”, “us”) handles personal data when you use
        the Steerly website, the Steerly admin dashboard and the Steerly mobile app (including apps published under a
        driving school's own brand), together the “<strong>Service</strong>”. It is written to meet the Digital
        Personal Data Protection Act, 2023 (“<strong>DPDP Act</strong>”), the rules made under it, and the Information
        Technology Act, 2000.
      </p>

      <h2>1. Who is responsible for your data</h2>
      <ul>
        <li>
          <strong>If you are a student or enquirer of a driving school</strong>, that driving school decides why and how
          your data is used. The school is the <em>Data Fiduciary</em> and Steerly acts as its <em>Data Processor</em>,
          processing your data only on the school's instructions to provide the Service. For most requests (for example
          correcting your address) you can contact your school directly; you can also contact us and we will pass the
          request on and help the school respond.
        </li>
        <li>
          <strong>If you are a school owner, staff member or instructor</strong>, or a visitor to steerly.app, Steerly
          is the Data Fiduciary for your account and contact data.
        </li>
      </ul>

      <h2>2. Data we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identity & contact</td>
            <td>Name, mobile number, email, address, date of birth, photo (optional)</td>
            <td>You, or your school when it enrols you</td>
          </tr>
          <tr>
            <td>Identity documents</td>
            <td>
              Copies of Aadhaar, PAN, passport, address proof, learner's licence (LL) / driving licence (DL), medical
              certificate (Form 1A) where required for RTO formalities
            </td>
            <td>You or your school (uploaded in the app)</td>
          </tr>
          <tr>
            <td>Training data</td>
            <td>
              Course, enrolment, lesson bookings, attendance, instructor notes, skill ratings, LL/DL application numbers,
              test dates and results
            </td>
            <td>Your school and its instructors</td>
          </tr>
          <tr>
            <td>Payment data</td>
            <td>
              Fee amounts, payment status, receipt numbers, Razorpay payment/order IDs, method (UPI/card/cash). We do
              <strong> not</strong> receive or store full card numbers, CVV, UPI PIN or bank passwords — these are
              handled by Razorpay.
            </td>
            <td>Razorpay, your school</td>
          </tr>
          <tr>
            <td>Enquiries</td>
            <td>Name, mobile number, course of interest, preferred time</td>
            <td>Enquiry forms on a school's page or in the app</td>
          </tr>
          <tr>
            <td>Device & usage</td>
            <td>Push notification token, app version, device model, crash logs, IP address, login timestamps</td>
            <td>Your device, automatically</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use advertising trackers and we do not sell personal data. The steerly.app website does not set
        marketing or analytics cookies.
      </p>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To create and secure your account and log you in by OTP.</li>
        <li>To let schools manage enquiries, enrolments, lesson bookings, instructors and vehicles.</li>
        <li>To track training progress and RTO test status, and to help prepare licence applications.</li>
        <li>To collect fees, issue receipts (including GST invoices) and keep accounting records.</li>
        <li>To send service messages — OTPs, lesson and payment reminders, test-date alerts — by SMS, WhatsApp or push notification.</li>
        <li>To keep the Service secure, prevent fraud and abuse, fix bugs and provide support.</li>
        <li>To comply with law, including tax, accounting and lawful requests from authorities.</li>
      </ul>
      <p>
        We process personal data on the basis of <strong>consent</strong> given at enquiry, enrolment or sign-up, and
        for <strong>legitimate uses</strong> permitted by Section 7 of the DPDP Act (for example where you voluntarily
        provide data for a specified purpose, or to comply with law). You may withdraw consent at any time (see section
        7); this will not affect processing already done, and some features may stop working.
      </p>

      <h2>4. Who we share it with</h2>
      <ul>
        <li><strong>Your driving school</strong> and its authorised staff and instructors — only within that school.</li>
        <li>
          <strong>Service providers</strong> who process data for us under contract: Google Cloud / Firebase (hosting,
          database, authentication, storage — primary region [asia-south1, Mumbai]), Razorpay (payments), [SMS/OTP
          provider, e.g. MSG91], [WhatsApp Business provider], Expo/Google (push notifications), [crash reporting, e.g.
          Sentry].
        </li>
        <li><strong>Authorities</strong> such as the RTO, tax authorities or law enforcement, when required by law.</li>
      </ul>
      <p>
        Some providers may process data outside India. We only transfer data to countries not restricted by the
        Government of India under Section 16 of the DPDP Act, and require providers to protect it.
      </p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Enquiries that do not convert: deleted or anonymised [12 months] after the last activity.</li>
        <li>Student records and documents: for the duration of training plus [3 years], unless the school or you ask for earlier deletion.</li>
        <li>Payment and invoice records: [8 years], as required by the Income-tax Act and GST law.</li>
        <li>School accounts: for the subscription period and up to [90 days] after cancellation, then deleted.</li>
        <li>Security logs: up to [1 year]. Backups are overwritten on a rolling basis within [35 days].</li>
      </ul>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit (TLS) and at rest. Access is restricted per school by database security rules and
        role-based permissions; documents are only visible to the student and their school's staff. We use App Check and
        OTP login. If a personal data breach occurs we will inform affected users and the Data
        Protection Board of India as required by the DPDP Act.
      </p>

      <h2>7. Your rights</h2>
      <p>Under the DPDP Act you have the right to:</p>
      <ul>
        <li><strong>Access</strong> a summary of your personal data and how it is processed.</li>
        <li><strong>Correction and completion</strong> of inaccurate or incomplete data (many fields are editable in the app).</li>
        <li><strong>Erasure</strong> of data no longer needed, subject to legal retention requirements — see <Link to="/delete-account">Delete your account</Link>.</li>
        <li><strong>Withdraw consent</strong> at any time, as easily as you gave it.</li>
        <li><strong>Grievance redressal</strong> through our Grievance Officer (below).</li>
        <li><strong>Nominate</strong> another person to exercise your rights in case of death or incapacity.</li>
      </ul>
      <p>
        Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> from your registered email, or contact us with
        your registered mobile number. We will verify your identity and respond within [30 days].
      </p>

      <h2>8. Children</h2>
      <p>
        Some learners (for example for a gearless two-wheeler licence) may be under 18. The DPDP Act treats them as
        children. Schools must obtain verifiable consent from a parent or lawful guardian before enrolling a child, and
        Steerly does not track, profile or send targeted advertising to children.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy. Material changes will be notified in the app or by email before they take effect.
      </p>

      <h2>10. Grievance Officer & contact</h2>
      <p>
        {GRIEVANCE.name}, Grievance Officer
        <br />
        {COMPANY}, {COMPANY_ADDRESS}
        <br />
        Email: <a href={`mailto:${GRIEVANCE.email}`}>{GRIEVANCE.email}</a> · Phone: {GRIEVANCE.phone}
      </p>
      <p>
        We acknowledge grievances within [48 hours] and aim to resolve them within [30 days]. If you are not satisfied,
        you may complain to the Data Protection Board of India.
      </p>
    </LegalLayout>
  );
}
