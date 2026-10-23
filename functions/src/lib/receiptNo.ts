export interface ReceiptCounter {
  year: number;
  seq: number;
}

/** Sequence restarts at 1 every calendar year (IST). */
export function nextCounter(current: ReceiptCounter | undefined, year: number): ReceiptCounter {
  return current && current.year === year ? { year, seq: current.seq + 1 } : { year, seq: 1 };
}

/** ("PDS", 2026, 42) → "PDS-2026-00042" */
export function formatReceiptNo(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}
