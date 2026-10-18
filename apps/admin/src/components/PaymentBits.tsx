import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { Payment, PaymentStatus } from '@steerly/shared';
import { call } from '../lib/callables';
import { useSchoolId } from '../lib/school';
import { Badge, type Tone } from './ui';
import { useToast } from './Toast';

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = { created: 'amber', paid: 'emerald', failed: 'red', cancelled: 'slate' };
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { created: 'Awaiting payment', paid: 'Paid', failed: 'Failed', cancelled: 'Cancelled' };

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONE[status] ?? 'slate'}>{PAYMENT_STATUS_LABEL[status] ?? status}</Badge>;
}

/** Opens the signed receipt URL from getReceiptUrl. */
export function ReceiptButton({ payment }: { payment: Payment }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (payment.status !== 'paid') return null;

  const open = async () => {
    // Open the tab synchronously so popup blockers allow it, then point it at the signed URL.
    const win = window.open('', '_blank');
    setBusy(true);
    try {
      const { url } = await call('getReceiptUrl', { schoolId, paymentId: payment.id });
      if (win) win.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      win?.close();
      toast.error(err, 'Receipt is not ready yet. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={open} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-60">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      {payment.receiptNo ?? 'Receipt'}
    </button>
  );
}
