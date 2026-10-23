import { useState, type FormEvent } from 'react';
import { where } from 'firebase/firestore';
import { Banknote, Copy, Link2, MessageCircle, Receipt } from 'lucide-react';
import { schoolCol, type Payment, type RecordManualPaymentInput } from '@steerly/shared';
import { call } from '../../lib/callables';
import { useLiveCollection } from '../../lib/hooks';
import { useSchool, useSchoolId } from '../../lib/school';
import { copyText, fmtDateTime, formatINR, PAYMENT_METHOD_LABELS, toPaise, waLink } from '../../lib/format';
import { Button, Card, FormField, Input, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { PaymentStatusBadge, ReceiptButton } from '../../components/PaymentBits';
import type { StudentTabProps } from './StudentProfilePage';

type Method = RecordManualPaymentInput['method'];

function RecordModal({ studentId, due, onClose }: { studentId: string; due: number; onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [amount, setAmount] = useState(due > 0 ? String(due / 100) : '');
  const [method, setMethod] = useState<Method>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const paise = toPaise(Number(amount));
    if (!(paise >= 100)) return toast.error('Enter at least ₹1.');
    setBusy(true);
    try {
      const res = await call('recordManualPayment', { schoolId, studentId, amount: paise, method, note: note.trim() });
      toast.success(`Recorded ${formatINR(paise)} · receipt ${res.receiptNo}`);
      onClose();
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Record payment"
      description="Cash, UPI or bank transfer received at the office."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="record-form" loading={busy}>
            Record
          </Button>
        </>
      }
    >
      <form id="record-form" onSubmit={submit} className="space-y-4">
        <FormField label="Amount (₹)">
          <Input autoFocus type="number" min={1} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </FormField>
        <FormField label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank transfer</option>
          </Select>
        </FormField>
        <FormField label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="UPI ref / instalment 2" />
        </FormField>
      </form>
    </Modal>
  );
}

function LinkModal({ studentId, studentName, phone, due, onClose }: { studentId: string; studentName: string; phone: string; due: number; onClose: () => void }) {
  const schoolId = useSchoolId();
  const { school } = useSchool();
  const toast = useToast();
  const [amount, setAmount] = useState(due > 0 ? String(due / 100) : '');
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const paise = toPaise(Number(amount));
    if (!(paise >= 100)) return toast.error('Enter at least ₹1.');
    setBusy(true);
    try {
      const res = await call('createPaymentLink', { schoolId, studentId, amount: paise });
      setUrl(res.url);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const message = url ? `Hi ${studentName.split(' ')[0]}, here is your ${school?.name ?? ''} fee payment link for ${formatINR(toPaise(Number(amount)))}: ${url}` : '';

  return (
    <Modal open onClose={onClose} size="sm" title="Payment link" description="Razorpay link — UPI, cards and netbanking. Marked paid automatically.">
      {!url ? (
        <form onSubmit={create} className="space-y-4">
          <FormField label="Amount (₹)">
            <Input autoFocus type="number" min={1} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </FormField>
          <Button type="submit" className="w-full" loading={busy} icon={Link2}>
            Create link
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="break-all rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200">{url}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={Copy} onClick={async () => ((await copyText(url)) ? toast.success('Link copied.') : toast.error('Copy failed — select and copy the link above.'))}>
              Copy
            </Button>
            <a href={waLink(phone, message)} target="_blank" rel="noreferrer">
              <Button variant="success" className="w-full" icon={MessageCircle}>
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function PaymentsTab({ student }: StudentTabProps) {
  const schoolId = useSchoolId();
  const { data, loading } = useLiveCollection<Payment>(schoolCol(schoolId, 'payments'), [where('studentId', '==', student.id)], student.id);
  const [modal, setModal] = useState<'record' | 'link' | null>(null);
  const rows = [...data].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  const due = Math.max(0, (student.feeTotal ?? 0) - (student.feePaid ?? 0));

  const columns: Column<Payment>[] = [
    { key: 'amount', header: 'Amount', cell: (p) => <span className="font-bold text-white">{formatINR(p.amount)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: 'method', header: 'Method', cell: (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
    { key: 'date', header: 'Date', cell: (p) => fmtDateTime(p.paidAt ?? p.createdAt) },
    { key: 'note', header: 'Note', cell: (p) => p.note || <span className="text-slate-600">—</span>, hideOnMobile: true },
    {
      key: 'receipt',
      header: 'Receipt',
      cell: (p) =>
        p.status === 'paid' ? (
          <ReceiptButton payment={p} />
        ) : p.razorpayPaymentLinkUrl ? (
          <a href={p.razorpayPaymentLinkUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-400 underline">
            Open link
          </a>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex-1">
          <p className="text-sm text-slate-400">
            Paid <span className="font-bold text-emerald-300">{formatINR(student.feePaid ?? 0)}</span> of {formatINR(student.feeTotal ?? 0)}
          </p>
          <p className="text-lg font-bold text-white">{due > 0 ? `${formatINR(due)} due` : 'Fully paid'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Banknote} onClick={() => setModal('record')}>
            Record payment
          </Button>
          <Button icon={Link2} onClick={() => setModal('link')}>
            Payment link
          </Button>
        </div>
      </Card>
      <DataTable rows={rows} columns={columns} rowKey={(p) => p.id} loading={loading} empty={{ icon: Receipt, title: 'No payments yet' }} />
      {modal === 'record' && <RecordModal studentId={student.id} due={due} onClose={() => setModal(null)} />}
      {modal === 'link' && <LinkModal studentId={student.id} studentName={student.name} phone={student.phone} due={due} onClose={() => setModal(null)} />}
    </div>
  );
}
