export interface GstBreakup {
  total: number; // paise, GST inclusive
  taxable: number;
  gst: number;
  cgst: number;
  sgst: number;
}

/** Splits a GST-inclusive amount (paise) into taxable value and CGST/SGST halves. */
export function gstBreakup(totalPaise: number, gstPercent: number): GstBreakup {
  if (gstPercent <= 0) return { total: totalPaise, taxable: totalPaise, gst: 0, cgst: 0, sgst: 0 };
  const taxable = Math.round((totalPaise * 100) / (100 + gstPercent));
  const gst = totalPaise - taxable;
  const cgst = Math.floor(gst / 2);
  return { total: totalPaise, taxable, gst, cgst, sgst: gst - cgst };
}

const fmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** PDF-safe money (built-in PDF fonts have no ₹ glyph): 550000 → "Rs. 5,500.00" */
export const formatRs = (paise: number): string => `Rs. ${fmt.format(paise / 100)}`;
