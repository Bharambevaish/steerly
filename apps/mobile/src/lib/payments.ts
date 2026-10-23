import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './callables';
import { useAuth } from './auth';
import { openUrl } from './device';

/** Create a Razorpay payment link for `amount` paise, open it, and refresh student/payments afterwards. */
export function usePay() {
  const { claims } = useAuth();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const pay = useCallback(
    async (amount: number) => {
      if (!claims.schoolId) throw new Error('You are not linked to a school yet.');
      setPaying(true);
      try {
        const { url } = await api.createPaymentLink({ schoolId: claims.schoolId, amount: Math.round(amount) });
        await openUrl(url);
        // The webhook marks the payment as paid; listeners update live, this just nudges the cache.
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['student'] }),
          qc.invalidateQueries({ queryKey: ['payments'] }),
        ]);
      } finally {
        setPaying(false);
      }
    },
    [claims.schoolId, qc],
  );
  return { pay, paying };
}

export async function openReceipt(schoolId: string, paymentId: string) {
  const { url } = await api.getReceiptUrl({ schoolId, paymentId });
  await openUrl(url);
}
