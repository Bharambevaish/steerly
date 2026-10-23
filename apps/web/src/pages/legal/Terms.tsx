import { Link } from 'react-router';
import { PLANS, TRIAL_DAYS, formatINR } from '@steerly/shared/lite';
import { COMPANY, COMPANY_ADDRESS, LegalLayout, SUPPORT_EMAIL } from './LegalLayout';

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of service"
      description="The terms that govern use of Steerly by driving schools, their staff, instructors and students."
    >
      <p>
        These Terms are an agreement between {COMPANY}, {COMPANY_ADDRESS} (“<strong>Steerly</strong>”) and you. By
        creating an account or using the Service you agree to them. If you sign up on behalf of a driving school, you
        confirm you are authorised to bind that school (the “<strong>School</strong>”).
      </p>

      <h2>1. The Service</h2>
      <p>
        Steerly is software for running a driving school: enquiries, enrolment, lesson booking, instructor tools, skill
        tracking, fee collection and receipts, reminders, RTO test tracking, vehicle document alerts and reports. Students
        and instructors use the mobile app at the invitation of a School.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You log in with a mobile number and one-time password. Keep access to your phone secure.</li>
        <li>Schools are responsible for who they invite as staff or instructors and for removing access when someone leaves.</li>
        <li>You must provide accurate information and be at least 18 years old to create a School account.</li>
      </ul>

      <h2>3. Free trial, plans and billing</h2>
      <ul>
        <li>New Schools get a {TRIAL_DAYS}-day free trial. No payment is taken during the trial.</li>
        <li>
          After the trial, continued use requires a paid plan (currently{' '}
          {Object.values(PLANS)
            .map((p) => `${p.name} ${formatINR(p.priceMonthly)}`)
            .join(', ')}{' '}
          per month, plus GST). Plan limits such as maximum active students apply.
        </li>
        <li>Subscriptions renew automatically each billing period until cancelled. Prices may change with 30 days' notice.</li>
        <li>
          If payment fails we may mark the account past due and, after [7] days, suspend it. Data is retained for [90]
          days after suspension or cancellation and then deleted.
        </li>
        <li>Refunds are covered by our <Link to="/refund">Refund & cancellation policy</Link>.</li>
      </ul>

      <h2>4. Student fee payments</h2>
      <p>
        Student fees are paid through Razorpay and are subject to Razorpay's terms. The School sets its own course fees
        and is solely responsible for its services to students, its refund decisions and the GST it charges. Steerly
        generates receipts from information the School provides and is not a party to the contract between a School and
        its students. [Lawyer to confirm settlement model with Razorpay — e.g. Razorpay Route / per-school accounts.]
      </p>

      <h2>5. School responsibilities</h2>
      <ul>
        <li>
          The School is the <em>Data Fiduciary</em> for its students' and enquirers' personal data under the DPDP Act. It
          must have a valid basis (usually consent) for the data it enters, give the required notices, obtain parental
          consent for students under 18, and handle rights requests. Steerly processes that data as the School's
          <em> Data Processor</em> under our <Link to="/privacy">Privacy policy</Link>.
        </li>
        <li>The School must hold the licences required under the Motor Vehicles Act, 1988 and applicable State rules.</li>
        <li>The School is responsible for the accuracy of course details, prices, test dates and instructor information.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>upload unlawful content, or data you have no right to share;</li>
        <li>send spam or unsolicited messages through the Service;</li>
        <li>try to access another School's data, probe or disrupt the Service, or reverse-engineer it;</li>
        <li>resell the Service without our written permission.</li>
      </ul>

      <h2>7. Your data and our IP</h2>
      <p>
        Schools own the data they put into Steerly and can export it at any time while the account is active. Steerly
        owns the software, design and trademarks. White-label apps are published using the School's name and logo under
        a licence the School grants us for that purpose.
      </p>

      <h2>8. Availability and support</h2>
      <p>
        We aim for high availability but do not guarantee the Service will be uninterrupted or error-free. Support is
        available at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> on working days.
      </p>

      <h2>9. Liability</h2>
      <p>
        To the extent permitted by law, the Service is provided “as is”. Steerly is not liable for indirect or
        consequential losses, and our total liability for any claim is limited to the fees paid by the School in the [3]
        months before the claim. Nothing limits liability that cannot be limited by law.
      </p>

      <h2>10. Termination</h2>
      <p>
        Schools can cancel any time from the dashboard. We may suspend or terminate accounts that breach these Terms,
        with notice where reasonably possible.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at [City] have exclusive jurisdiction. We may update these
        Terms and will notify Schools of material changes in advance.
      </p>
    </LegalLayout>
  );
}
