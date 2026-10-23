import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { limit, orderBy } from 'firebase/firestore';
import { Download, IndianRupee, Receipt, Timer, Wallet } from 'lucide-react';
import { schoolCol, type Payment, type PaymentMethod, type PaymentStatus } from '@steerly/shared';
import { useLiveCollection } from '../lib/hooks';
import { useSchoolId } from '../lib/school';
import { addDaysYmd, downloadCsv, fmt, fmtDateTime, formatINR, istDate, PAYMENT_METHOD_LABELS, todayYmd } from '../lib/format';
import { Button, Input, PageHeader, SearchInput, Select } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { StatCard } from '../components/StatCard';
import { PaymentStatusBadge, ReceiptButton } from '../components/PaymentBits';
import { PAYMENT_STATUS_LABEL } from '../lib/labels';

const when = (p: Payment) => (p.paidAt ?? p.createdAt)?.toMillis?.() ?? 0;

export default function PaymentsPage() {
  const schoolId = useSchoolId();
  const { data, loading } = useLiveCollection<Payment>(schoolCol(schoolId, 'payments'), [orderBy('createdAt', 'desc'), limit(1000)], 'recent1000');
  const [status, setStatus] = useState<'' | PaymentStatus>('');
  const [method, setMethod] = useState<'' | PaymentMethod>('');
  const [from, setFrom] = useState(addDaysYmd(todayYmd(), -30));
  const [to, setTo] = useState(todayYmd());
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const lo = from ? istDate(from).getTime() : 0;
    const hi = to ? istDate(addDaysYmd(to, 1)).getTime() : Infinity;
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const t = when(p);
      return (
        (!status || p.status === status) &&
        (!method || p.method === method) &&
        t >= lo &&
        t < hi &&
        (!q || p.studentName.toLowerCase().includes(q) || (p.receiptNo ?? '').toLowerCase().includes(q))
      );
    });
  }, [data, status, method, from, to, search]);

  const totals = useMemo(() => {
    const paid = rows.filter((p) => p.status === 'paid');
    return {
      collected: paid.reduce((s, p) => s + p.amount, 0),
      count: paid.length,
      pending: rows.filter((p) => p.status === 'created').reduce((s, p) => s + p.amount, 0),
      online: paid.filter((p) => p.method === 'razorpay').reduce((s, p) => s + p.amount, 0),
    };
  }, [rows]);

  const columns: Column<Payment>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: (p) => (
        <Link to={`/students/${p.studentId}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-white hover:text-brand">
          {p.studentName}
        </Link>
      ),
    },
    { key: 'amount', header: 'Amount', cell: (p) => <span className="font-bold text-white">{formatINR(p.amount)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: 'method', header: 'Method', cell: (p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method },
    { key: 'date', header: 'Date', cell: (p) => fmtDateTime(p.paidAt ?? p.createdAt) },
    { key: 'note', header: 'Note', cell: (p) => p.note || '—', hideOnMobile: true },
    { key: 'receipt', header: 'Receipt', cell: (p) => <ReceiptButton payment={p} /> },
  ];

  const exportCsv = () =>
    downloadCsv(`payments_${from}_${to}.csv`, [
      ['Date', 'Student', 'Amount (INR)', 'Status', 'Method', 'Receipt no', 'Note', 'Razorpay payment id'],
      ...rows.map((p) => [fmt(p.paidAt ?? p.createdAt, 'yyyy-MM-dd HH:mm'), p.studentName, p.amount / 100, PAYMENT_STATUS_LABEL[p.status], PAYMENT_METHOD_LABELS[p.method], p.receiptNo ?? '', p.note, p.razorpayPaymentId ?? '']),
    ]);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Fees collected online and at the office. Record new payments from a student's profile."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={formatINR(totals.collected)} icon={IndianRupee} accent loading={loading} />
        <StatCard label="Payments" value={String(totals.count)} icon={Receipt} loading={loading} />
        <StatCard label="Online" value={formatINR(totals.online)} icon={Wallet} loading={loading} />
        <StatCard label="Awaiting" value={formatINR(totals.pending)} icon={Timer} hint="Open payment links" loading={loading} />
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Student or receipt…" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)}>
          <option value="">All statuses</option>
          {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={method} onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)}>
          <option value="">All methods</option>
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
      <DataTable rows={rows} columns={columns} rowKey={(p) => p.id} loading={loading} empty={{ icon: Receipt, title: 'No payments in this range', description: 'Change the filters or date range.' }} />
    </>
  );
}
