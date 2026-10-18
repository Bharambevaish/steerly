import { CircleCheck, CircleX, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CONTACT_EMAIL, PLAY_STORE_URL } from '../lib/config';

type Outcome = 'paid' | 'failed' | 'pending';

/** Razorpay Payment Link callback. Display only — the webhook is the source of truth for marking payments paid. */
function outcomeFrom(params: URLSearchParams): Outcome {
  const status = (params.get('razorpay_payment_link_status') ?? '').toLowerCase();
  if (status === 'paid') return 'paid';
  if (['failed', 'cancelled', 'expired'].includes(status)) return 'failed';
  return 'pending';
}

const COPY: Record<Outcome, { title: string; body: string }> = {
  paid: {
    title: 'Payment received',
    body: 'Thank you! Your receipt will appear in the app shortly. You can close this page.',
  },
  failed: {
    title: 'Payment not completed',
    body: 'Your payment did not go through and no money was taken. If an amount was debited, it will be refunded automatically by your bank within 5–7 working days. You can retry from the app or the payment link.',
  },
  pending: {
    title: 'Checking your payment',
    body: "We haven't received a confirmation yet. If you completed the payment, your receipt will appear in the app within a few minutes.",
  },
};

export default function Paid() {
  const [params] = useSearchParams();
  const outcome = outcomeFrom(params);
  const paymentId = params.get('razorpay_payment_id');
  const { title, body } = COPY[outcome];
  useDocumentTitle(title);

  const Icon = outcome === 'paid' ? CircleCheck : outcome === 'failed' ? CircleX : Clock;
  const tone =
    outcome === 'paid'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
      : outcome === 'failed'
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300';

  return (
    <section className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="glass w-full max-w-lg animate-fade-up p-8 text-center sm:p-10" role="status" aria-live="polite">
        <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${tone}`}>
          <Icon className="h-10 w-10" />
        </span>
        <h1 className="h-display mt-6 text-3xl">{title}</h1>
        <p className="muted mt-3 leading-7">{body}</p>
        {paymentId && (
          <p className="muted mt-5 text-xs">
            Reference: <span className="font-mono">{paymentId}</span>
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {PLAY_STORE_URL && (
            <a href={PLAY_STORE_URL} className="btn-primary">
              Open the app
            </a>
          )}
          <Link to="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
        <p className="muted mt-6 text-xs">
          Questions about a payment? Contact your driving school, or write to{' '}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
