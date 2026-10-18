// Money is stored as integer paise everywhere. Convert only at the UI edge.
export const toPaise = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paise: number): number => paise / 100;

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 1234500 → "₹12,345" */
export const formatINR = (paise: number): string => inr.format(paise / 100);

/** "9876543210" → "+919876543210" */
export const toE164 = (tenDigit: string): string => `+91${tenDigit.replace(/\D/g, '').slice(-10)}`;

/** "+919876543210" → "9876543210" */
export const fromE164 = (e164: string): string => e164.replace(/\D/g, '').slice(-10);
