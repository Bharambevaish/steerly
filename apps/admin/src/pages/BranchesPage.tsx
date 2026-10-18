import { useState, type FormEvent } from 'react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { phoneSchema, schoolCol, type Branch } from '@steerly/shared';
import { db } from '../lib/firebase';
import { useSchool, useSchoolId } from '../lib/school';
import { Badge, Button, Card, EmptyState, FormField, IconButton, Input, PageHeader, Textarea, Toggle } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

function BranchModal({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [f, setF] = useState({ name: branch?.name ?? '', address: branch?.address ?? '', phone: branch?.phone ?? '', active: branch?.active ?? true });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.error('Enter a branch name.');
    let phone: string | null = null;
    if (f.phone.trim()) {
      const p = phoneSchema.safeParse(f.phone);
      if (!p.success) return toast.error('Enter a valid 10-digit phone or leave it empty.');
      phone = p.data;
    }
    setBusy(true);
    try {
      const ref = branch ? doc(db, schoolCol(schoolId, 'branches'), branch.id) : doc(collection(db, schoolCol(schoolId, 'branches')));
      await setDoc(ref, { id: ref.id, name: f.name.trim(), address: f.address.trim(), phone, active: f.active });
      toast.success(branch ? 'Branch updated.' : 'Branch added.');
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
      title={branch ? 'Edit branch' : 'Add branch'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="space-y-4">
        <FormField label="Name">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Kothrud" required />
        </FormField>
        <FormField label="Address">
          <Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={2} />
        </FormField>
        <FormField label="Phone">
          <Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Optional" />
        </FormField>
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Active" />
      </form>
    </Modal>
  );
}

export default function BranchesPage() {
  const schoolId = useSchoolId();
  const { branches, isOwner } = useSchool();
  const toast = useToast();
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Branch | null>(null);

  return (
    <>
      <PageHeader
        title="Branches"
        subtitle={isOwner ? 'Locations your school operates from.' : 'Only the owner can add or edit branches.'}
        actions={
          isOwner && (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Add branch
            </Button>
          )
        }
      />
      {branches.length === 0 ? (
        <EmptyState icon={Building2} title="No branches" description="Single location? You can skip this. Multiple offices? Add each one here." action={isOwner && <Button icon={Plus} onClick={() => setEditing('new')}>Add branch</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-white">{b.name}</h3>
                {b.active === false ? <Badge>Inactive</Badge> : <Badge tone="emerald">Active</Badge>}
              </div>
              {b.address && (
                <p className="mt-2 flex gap-1.5 text-sm text-slate-400">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {b.address}
                </p>
              )}
              {b.phone && (
                <p className="mt-1 flex items-center gap-1.5 font-mono text-sm text-slate-400">
                  <Phone className="h-4 w-4" /> +91 {b.phone}
                </p>
              )}
              {isOwner && (
                <div className="mt-3 flex justify-end">
                  <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(b)} />
                  <IconButton icon={Trash2} label="Delete" onClick={() => setToDelete(b)} className="hover:text-red-300" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && <BranchModal branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        danger
        title="Delete branch?"
        message={`"${toDelete?.name}" will be removed. Students and vehicles linked to it keep the old branch id.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteDoc(doc(db, schoolCol(schoolId, 'branches'), toDelete!.id));
            toast.success('Branch deleted.');
          } catch (err) {
            toast.error(err);
            throw err;
          }
        }}
      />
    </>
  );
}
