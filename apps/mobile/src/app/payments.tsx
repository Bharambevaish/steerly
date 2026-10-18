import React, { useState } from 'react';
import { View } from 'react-native';
import { toPaise } from '@steerly/shared';
import { useAuth } from '@/lib/auth';
import { useMyPayments, useMyStudent } from '@/lib/data';
import { openReceipt, usePay } from '@/lib/payments';
import { fmtDateTime, formatINR } from '@/lib/format';
import { Badge, Button, Card, Chip, EmptyState, Icon, Input, ProgressBar, Row, Screen, Sheet, SkeletonList, Text, useTheme, useToast } from '@/ui';

const METHOD: Record<string, string> = { razorpay: 'Online', cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank transfer' };
const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  paid: { label: 'Paid', tone: 'success' },
  created: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export default function Payments() {
  const t = useTheme();
  const toast = useToast();
  const { claims } = useAuth();
  const student = useMyStudent();
  const payments = useMyPayments();
  const { pay, paying } = usePay();
  const [sheet, setSheet] = useState(false);
  const [custom, setCustom] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  const s = student.data;
  const total = s?.feeTotal ?? 0;
  const paid = s?.feePaid ?? 0;
  const due = Math.max(0, total - paid);

  const doPay = async (amount: number) => {
    if (amount < 100) {
      toast.error('Minimum payment is ₹1.');
      return;
    }
    if (amount > due) {
      toast.error(`You only owe ${formatINR(due)}.`);
      return;
    }
    try {
      await pay(amount);
      setSheet(false);
    } catch (e) {
      toast.error(e);
    }
  };

  const receipt = async (id: string) => {
    if (!claims.schoolId) return;
    setOpening(id);
    try {
      await openReceipt(claims.schoolId, id);
    } catch (e) {
      toast.error(e);
    } finally {
      setOpening(null);
    }
  };

  const half = Math.round(due / 2);

  return (
    <Screen back title="Payments" onRefresh={() => Promise.all([student.refetch(), payments.refetch()])}>
      <Card gradient>
        <Text variant="label" color={t.c.onBrand} style={{ opacity: 0.85 }}>
          {due > 0 ? 'Balance due' : 'Balance'}
        </Text>
        <Text variant="hero" color={t.c.onBrand}>
          {due > 0 ? formatINR(due) : 'All paid'}
        </Text>
        <Text variant="small" color={t.c.onBrand} style={{ opacity: 0.85, marginBottom: 12 }}>
          {formatINR(paid)} paid of {formatINR(total)}
        </Text>
        <ProgressBar value={total ? paid / total : 0} color={t.c.onBrand} />
        {due >= 100 ? <Button title="Pay now" variant="secondary" icon="card" style={{ marginTop: 16 }} onPress={() => setSheet(true)} /> : null}
      </Card>

      <Text variant="h3">History</Text>
      {payments.loading ? (
        <SkeletonList count={3} h={72} />
      ) : payments.data.length === 0 ? (
        <EmptyState icon="receipt" title="No payments yet" body="Your payments and receipts will show up here." />
      ) : (
        payments.data.map((p) => {
          const st = STATUS[p.status ?? ''] ?? { label: p.status ?? '—', tone: 'neutral' as const };
          return (
            <Card key={p.id}>
              <Row>
                <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surfaceAlt }}>
                  <Icon name={p.method === 'razorpay' ? 'card' : 'receipt'} size={20} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h3">{formatINR(p.amount)}</Text>
                  <Text variant="caption" muted>
                    {METHOD[p.method ?? ''] ?? 'Payment'} · {fmtDateTime(p.paidAt ?? p.createdAt)}
                  </Text>
                  {p.receiptNo ? (
                    <Text variant="caption" faint>
                      Receipt {p.receiptNo}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Badge label={st.label} tone={st.tone} />
                  {p.status === 'paid' && p.receiptNo ? (
                    <Button title="Receipt" size="sm" variant="secondary" full={false} icon="external" loading={opening === p.id} onPress={() => receipt(p.id)} />
                  ) : null}
                </View>
              </Row>
            </Card>
          );
        })
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Pay fees">
        <Text variant="small" muted>
          You’ll be taken to a secure Razorpay page (UPI, cards, netbanking). Come back here when you’re done.
        </Text>
        <Row wrap gap={8}>
          <Chip label={`Full ${formatINR(due)}`} onPress={() => doPay(due)} />
          {half >= 100 && half < due ? <Chip label={`Half ${formatINR(half)}`} onPress={() => doPay(half)} /> : null}
        </Row>
        <Input label="Or enter an amount (₹)" value={custom} onChangeText={(v) => setCustom(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" prefix="₹" />
        <Button title="Pay this amount" icon="card" loading={paying} disabled={!custom} onPress={() => doPay(toPaise(Number(custom) || 0))} />
      </Sheet>
    </Screen>
  );
}
