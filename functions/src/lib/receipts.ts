import PDFDocument from 'pdfkit';
import type { Transaction } from 'firebase-admin/firestore';
import { receiptPath, type Payment, type School, type Student } from '@steerly/shared';
import { db, bucket } from './admin';
import { sub } from './data';
import { formatRs, gstBreakup } from './gst';
import { formatReceiptNo, nextCounter, type ReceiptCounter } from './receiptNo';
import { istDateLabel, istYear } from './time';

const counterRef = (schoolId: string) => sub(schoolId, 'counters').doc('receipts');

/** Allocates the next receipt number inside an existing transaction (call after all other reads). */
export async function allocateReceiptNo(tx: Transaction, schoolId: string, prefix: string, nowMs = Date.now()): Promise<string> {
  const ref = counterRef(schoolId);
  const current = (await tx.get(ref)).data() as ReceiptCounter | undefined;
  const next = nextCounter(current, istYear(nowMs));
  tx.set(ref, next);
  return formatReceiptNo(prefix, next.year, next.seq);
}

/** Standalone allocation: `${prefix}-${YYYY}-${00001}`. */
export async function nextReceiptNo(schoolId: string, prefix: string): Promise<string> {
  return db.runTransaction((tx) => allocateReceiptNo(tx, schoolId, prefix));
}

const METHOD_LABEL: Record<Payment['method'], string> = {
  razorpay: 'Online (Razorpay)',
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
};

export function renderReceiptPdf(school: School, student: Student, payment: Payment): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Receipt ${payment.receiptNo ?? ''}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const brand = /^#[0-9a-f]{6}$/i.test(school.brandColor) ? school.brandColor : '#F59E0B';
    doc.rect(0, 0, doc.page.width, 8).fill(brand);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(20).text(school.name, 50, 40);
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
    const addr = [school.address, school.city].filter(Boolean).join(', ');
    if (addr) doc.text(addr);
    doc.text(`Phone: ${school.phone}${school.email ? `   Email: ${school.email}` : ''}`);
    if (school.settings.gstin) doc.text(`GSTIN: ${school.settings.gstin}`);

    doc.moveDown(1.5).fillColor('#111827').font('Helvetica-Bold').fontSize(16).text('Fee Receipt');
    doc.moveDown(0.5).font('Helvetica').fontSize(11);
    const paidMs = payment.paidAt?.toMillis() ?? Date.now();
    const rows: [string, string][] = [
      ['Receipt no.', payment.receiptNo ?? '-'],
      ['Date', istDateLabel(paidMs)],
      ['Student', student.name],
      ['Phone', student.phone],
      ['Course', student.courseName],
      ['Payment method', METHOD_LABEL[payment.method]],
    ];
    if (payment.razorpayPaymentId) rows.push(['Transaction ID', payment.razorpayPaymentId]);
    if (payment.note) rows.push(['Note', payment.note]);
    table(doc, rows);

    doc.moveDown(1);
    const gstPercent = school.settings.gstPercent ?? 0;
    const g = gstBreakup(payment.amount, gstPercent);
    const money: [string, string][] = [];
    if (gstPercent > 0) {
      money.push(['Taxable value', formatRs(g.taxable)]);
      money.push([`CGST @ ${gstPercent / 2}%`, formatRs(g.cgst)]);
      money.push([`SGST @ ${gstPercent / 2}%`, formatRs(g.sgst)]);
    }
    money.push([gstPercent > 0 ? 'Amount paid (incl. GST)' : 'Amount paid', formatRs(payment.amount)]);
    money.push(['Total course fee', formatRs(student.feeTotal)]);
    money.push(['Balance due', formatRs(Math.max(0, student.feeTotal - student.feePaid))]);
    table(doc, money, true);

    doc.moveDown(3).fontSize(9).fillColor('#6B7280').text('This is a computer-generated receipt and does not need a signature.', { align: 'center' });
    doc.text('Powered by Steerly', { align: 'center' });
    doc.end();
  });
}

function table(doc: PDFKit.PDFDocument, rows: [string, string][], boldLast = false): void {
  const left = 50;
  const valueX = 230;
  rows.forEach(([k, v], i) => {
    const y = doc.y;
    const bold = boldLast && i === rows.length - 1;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#6B7280').text(k, left, y, { width: 170 });
    doc.fillColor('#111827').text(v, valueX, y, { width: 315 });
    doc.moveDown(0.4);
  });
  doc.x = left;
}

/** Renders and stores the receipt PDF; returns its Storage path. `student` should reflect the post-payment balance. */
export async function saveReceiptPdf(schoolId: string, school: School, student: Student, payment: Payment): Promise<string> {
  const path = receiptPath(schoolId, payment.id);
  const pdf = await renderReceiptPdf(school, student, payment);
  await bucket().file(path).save(pdf, { contentType: 'application/pdf', resumable: false });
  return path;
}
