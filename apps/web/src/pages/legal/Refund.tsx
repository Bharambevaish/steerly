import { TRIAL_DAYS } from '@steerly/shared/lite';
import { LegalLayout, SUPPORT_EMAIL } from './LegalLayout';

export default function Refund() {
  return (
    <LegalLayout
      title="Refund & cancellation policy"
      description="How cancellations and refunds work for Steerly subscriptions and for student fee payments made through Steerly."
    >
      <h2>1. Steerly subscriptions (for driving schools)</h2>
      <ul>
        <li>
          <strong>Free trial:</strong> every new school gets a {TRIAL_DAYS}-day free trial. Nothing is charged during the
          trial, so no refund is needed if you decide not to continue.
        </li>
        <li>
          <strong>Cancellation:</strong> you can cancel at any time from the dashboard. Cancellation stops the next
          renewal; you keep access until the end of the period already paid for.
        </li>
        <li>
          <strong>Refunds:</strong> subscription fees are non-refundable for partially used periods, except where the
          Service was unavailable for a significant part of the period due to our fault, or you were charged in error. In
          those cases contact us within [7] days of the charge.
        </li>
        <li>
          <strong>Duplicate or failed charges:</strong> if money was debited but the payment failed, or you were charged
          twice, the amount is refunded to the original payment method — usually within 5–7 working days of
          confirmation.
        </li>
      </ul>

      <h2>2. Student fees paid to a driving school</h2>
      <p>
        Course fees are set and collected by your driving school using Steerly's payment links. Whether a course fee is
        refundable (for example if you cancel before lessons start) is decided by <strong>your driving school's own
        refund policy</strong> — please contact the school first.
      </p>
      <ul>
        <li>Approved refunds are made to the original payment method through Razorpay, usually within 5–7 working days.</li>
        <li>If an amount was debited but no receipt appears in the app within 24 hours, contact your school with the payment reference.</li>
        <li>Lessons cancelled by the school or instructor should be rescheduled or refunded as per the school's policy.</li>
      </ul>

      <h2>3. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your registered mobile number, the payment
        reference (Razorpay payment ID or receipt number), the amount and the reason. We respond within [2] working days.
      </p>
    </LegalLayout>
  );
}
