import { useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Car, Pencil, Plus, Trash2 } from 'lucide-react';
import { schoolCol, type FsTimestamp, type Vehicle, type VehicleType } from '@steerly/shared';
import { db } from '../lib/firebase';
import { useLiveCollection } from '../lib/hooks';
import { useSchool, useSchoolId } from '../lib/school';
import { daysUntil, fmt, tsToYmd, VEHICLE_TYPE_LABELS, ymdToTs } from '../lib/format';
import { Badge, Button, FormField, IconButton, Input, PageHeader, Select, Toggle } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

const WARN_DAYS = 15;

function ExpiryBadge({ ts }: { ts: FsTimestamp | null }) {
  const d = daysUntil(ts);
  if (d == null) return <span className="text-slate-600">—</span>;
  if (d < 0) return <Badge tone="red">Expired {fmt(ts, 'd MMM yy')}</Badge>;
  if (d <= WARN_DAYS) return <Badge tone={d <= 3 ? 'red' : 'amber'}>{d === 0 ? 'Today' : `${d}d left`} · {fmt(ts, 'd MMM')}</Badge>;
  return <span className="text-slate-300">{fmt(ts, 'd MMM yyyy')}</span>;
}

function VehicleModal({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const schoolId = useSchoolId();
  const { branches } = useSchool();
  const toast = useToast();
  const [f, setF] = useState({
    regNumber: vehicle?.regNumber ?? '',
    model: vehicle?.model ?? '',
    type: (vehicle?.type ?? 'car_manual') as VehicleType,
    branchId: vehicle?.branchId ?? '',
    insuranceExpiry: tsToYmd(vehicle?.insuranceExpiry),
    pucExpiry: tsToYmd(vehicle?.pucExpiry),
    fitnessExpiry: tsToYmd(vehicle?.fitnessExpiry),
    active: vehicle?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.regNumber.trim()) return toast.error('Enter the registration number.');
    setBusy(true);
    try {
      const ref = vehicle ? doc(db, schoolCol(schoolId, 'vehicles'), vehicle.id) : doc(collection(db, schoolCol(schoolId, 'vehicles')));
      await setDoc(ref, {
        id: ref.id,
        regNumber: f.regNumber.trim().toUpperCase(),
        model: f.model.trim(),
        type: f.type,
        branchId: f.branchId || null,
        insuranceExpiry: ymdToTs(f.insuranceExpiry),
        pucExpiry: ymdToTs(f.pucExpiry),
        fitnessExpiry: ymdToTs(f.fitnessExpiry),
        active: f.active,
      });
      toast.success(vehicle ? 'Vehicle updated.' : 'Vehicle added.');
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
      title={vehicle ? 'Edit vehicle' : 'Add vehicle'}
      description="You'll get a reminder before insurance, PUC or fitness expires."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="vehicle-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Registration number">
          <Input autoFocus value={f.regNumber} onChange={set('regNumber')} placeholder="MH12 AB 1234" required />
        </FormField>
        <FormField label="Model">
          <Input value={f.model} onChange={set('model')} placeholder="Maruti Swift" />
        </FormField>
        <FormField label="Type">
          <Select value={f.type} onChange={set('type')}>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Branch">
          <Select value={f.branchId} onChange={set('branchId')}>
            <option value="">None</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Insurance expiry">
          <Input type="date" value={f.insuranceExpiry} onChange={set('insuranceExpiry')} />
        </FormField>
        <FormField label="PUC expiry">
          <Input type="date" value={f.pucExpiry} onChange={set('pucExpiry')} />
        </FormField>
        <FormField label="Fitness expiry">
          <Input type="date" value={f.fitnessExpiry} onChange={set('fitnessExpiry')} />
        </FormField>
        <div className="flex items-end pb-2">
          <Toggle checked={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} label="In service" />
        </div>
      </form>
    </Modal>
  );
}

export default function VehiclesPage() {
  const schoolId = useSchoolId();
  const { branches } = useSchool();
  const toast = useToast();
  const { data, loading } = useLiveCollection<Vehicle>(schoolCol(schoolId, 'vehicles'));
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);
  const rows = [...data].sort((a, b) => a.regNumber.localeCompare(b.regNumber));

  const expiringCount = data.filter((v) =>
    [v.insuranceExpiry, v.pucExpiry, v.fitnessExpiry].some((t) => {
      const d = daysUntil(t);
      return d != null && d <= WARN_DAYS;
    }),
  ).length;

  const columns: Column<Vehicle>[] = [
    {
      key: 'reg',
      header: 'Vehicle',
      cell: (v) => (
        <div>
          <p className="font-mono font-bold text-white">{v.regNumber}</p>
          <p className="text-xs text-slate-500">
            {v.model || '—'} · {VEHICLE_TYPE_LABELS[v.type] ?? v.type}
            {v.active === false && ' · out of service'}
          </p>
        </div>
      ),
    },
    { key: 'ins', header: 'Insurance', cell: (v) => <ExpiryBadge ts={v.insuranceExpiry} /> },
    { key: 'puc', header: 'PUC', cell: (v) => <ExpiryBadge ts={v.pucExpiry} /> },
    { key: 'fit', header: 'Fitness', cell: (v) => <ExpiryBadge ts={v.fitnessExpiry} /> },
    { key: 'branch', header: 'Branch', cell: (v) => branches.find((b) => b.id === v.branchId)?.name ?? '—', hideOnMobile: true },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideOnMobile: true,
      cell: (v) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(v)} />
          <IconButton icon={Trash2} label="Delete" onClick={() => setToDelete(v)} className="hover:text-red-300" />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle={expiringCount ? <span className="text-amber-300">{expiringCount} vehicle(s) have documents expiring within {WARN_DAYS} days</span> : 'Fleet and document expiry dates.'}
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Add vehicle
          </Button>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(v) => v.id}
        loading={loading}
        onRowClick={(v) => setEditing(v)}
        mobileActions={(v) => <IconButton icon={Trash2} label="Delete" onClick={() => setToDelete(v)} className="hover:text-red-300" />}
        empty={{ icon: Car, title: 'No vehicles yet', description: 'Add your training cars to track insurance, PUC and fitness expiry.', action: <Button icon={Plus} onClick={() => setEditing('new')}>Add vehicle</Button> }}
      />
      {editing && <VehicleModal vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Delete vehicle?"
        message={`${toDelete?.regNumber} will be removed from your fleet.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteDoc(doc(db, schoolCol(schoolId, 'vehicles'), toDelete!.id));
            toast.success('Vehicle deleted.');
          } catch (err) {
            toast.error(err);
            throw err;
          }
        }}
      />
    </>
  );
}
