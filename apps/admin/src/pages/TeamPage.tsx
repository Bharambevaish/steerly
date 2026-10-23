import { useState, type FormEvent } from 'react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Crown, Mail, Phone, Send, UserPlus, Users, X } from 'lucide-react';
import { phoneSchema, schoolCol, type Invite, type Member } from '@steerly/shared';
import { db } from '../lib/firebase';
import { call } from '../lib/callables';
import { useLiveCollection } from '../lib/hooks';
import { givesLessons, useSchool, useSchoolId } from '../lib/school';
import { timeAgo } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { Avatar, Badge, Button, Card, FormField, Input, PageHeader, Select, Toggle, type Tone } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

type TeamRole = Member['role'];
const ROLE_LABEL: Record<TeamRole, string> = { owner: 'Owner', staff: 'Office staff', instructor: 'Instructor' };
const ROLE_TONE: Record<TeamRole, Tone> = { owner: 'violet', staff: 'blue', instructor: 'brand' };

function InviteModal({ onClose }: { onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', role: 'instructor' as TeamRole });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const phone = phoneSchema.safeParse(f.phone);
    if (f.name.trim().length < 2) return toast.error('Enter their name.');
    if (!phone.success) return toast.error('Enter a valid 10-digit mobile number.');
    setBusy(true);
    try {
      await call('inviteMember', { schoolId, phone: phone.data, name: f.name.trim(), role: f.role });
      toast.success(`Invite sent. ${f.name.trim()} can now sign in with OTP on +91 ${phone.data}.`);
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
      title="Invite a team member"
      description="They sign in with OTP on this number (admin web for staff, mobile app for instructors)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" loading={busy} icon={Send}>
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="space-y-4">
        <FormField label="Name">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </FormField>
        <FormField label="Mobile">
          <Input type="tel" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required placeholder="10 digits" />
        </FormField>
        <FormField label="Role">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as TeamRole })}>
            <option value="instructor">Instructor — mobile app</option>
            <option value="staff">Office staff — dashboard</option>
            <option value="owner">Co-owner — full access</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}

function OwnershipCard({ owners, youAreOwner }: { owners: Member[]; youAreOwner: boolean }) {
  const soleOwner = youAreOwner && owners.length <= 1;
  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <Crown className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-2 text-sm text-slate-400">
          <h3 className="text-sm font-bold text-white">Transferring ownership</h3>
          <p>
            A school always needs at least one active owner, and you can’t remove your own owner access. To hand the school over, or before deleting your own
            account:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Change another team member’s role to <span className="font-semibold text-slate-200">Owner</span> above.
            </li>
            <li>Ask them to sign in and change your role to Office staff or Instructor (or deactivate you).</li>
            <li>You can then delete your account from the Steerly app (Profile → Delete account).</li>
          </ol>
          {youAreOwner && (
            <p className={soleOwner ? 'font-semibold text-amber-300' : 'text-slate-500'}>
              {soleOwner ? 'You’re the only owner right now, so your account can’t be deleted yet.' : `Owners: ${owners.map((o) => o.name).join(', ')}.`}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface RoleChange {
  member: Member;
  role: TeamRole;
}

export default function TeamPage() {
  const schoolId = useSchoolId();
  const { members, isOwner } = useSchool();
  const { user } = useAuth();
  const toast = useToast();
  const invites = useLiveCollection<Invite & { id: string }>(schoolCol(schoolId, 'invites'));
  const [inviting, setInviting] = useState(false);
  const [cancelInvite, setCancelInvite] = useState<(Invite & { id: string }) | null>(null);
  const [roleChange, setRoleChange] = useState<RoleChange | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const owners = members.filter((m) => m.role === 'owner' && m.active !== false);
  const me = members.find((m) => m.uid === user?.uid);

  /** Role/active go through updateMember (it also updates claims). Resolves false when it failed. */
  const update = async (m: Member, patch: { role?: TeamRole; active?: boolean }): Promise<boolean> => {
    setBusyUid(m.uid);
    try {
      await call('updateMember', { schoolId, uid: m.uid, ...patch });
      // An instructor moved to owner/staff keeps teaching, so their students and schedule stay valid.
      if (patch.role && patch.role !== 'instructor' && m.role === 'instructor' && m.teaches !== true) {
        await updateDoc(doc(db, schoolCol(schoolId, 'members'), m.uid), { teaches: true });
      }
      toast.success(patch.role === 'owner' ? `${m.name} is now an owner.` : 'Member updated.');
      return true;
    } catch (err) {
      toast.error(err);
      return false;
    } finally {
      setBusyUid(null);
    }
  };

  const changeRole = (m: Member, role: TeamRole) => {
    if (role === m.role) return;
    // Granting or removing owner access is a big deal: confirm first.
    if (role === 'owner' || m.role === 'owner') setRoleChange({ member: m, role });
    else void update(m, { role });
  };

  /** "Gives lessons" is a plain member field owners may write directly (see firestore.rules). */
  const setTeaches = async (m: Member, teaches: boolean) => {
    setBusyUid(m.uid);
    try {
      await updateDoc(doc(db, schoolCol(schoolId, 'members'), m.uid), { teaches });
      toast.success(teaches ? `${m.name} can now be assigned students and lessons.` : `${m.name} no longer shows up as an instructor.`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyUid(null);
    }
  };

  const rows = [...members].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">
              {m.name} {m.uid === user?.uid && <span className="text-xs font-normal text-slate-500">(you)</span>}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              {m.phone ? (
                <>
                  <Phone className="h-3 w-3 shrink-0" /> {m.phone}
                </>
              ) : m.email ? (
                <>
                  <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{m.email}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (m) =>
        isOwner && m.uid !== user?.uid ? (
          <Select
            value={m.role}
            disabled={busyUid === m.uid}
            onChange={(e) => changeRole(m, e.target.value as TeamRole)}
            aria-label={`Role for ${m.name}`}
            className="w-full max-w-40 py-1.5 text-xs"
          >
            {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        ) : (
          <Badge tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role] ?? m.role}</Badge>
        ),
    },
    {
      key: 'teaches',
      header: 'Gives lessons',
      cell: (m) =>
        m.role === 'instructor' ? (
          <span className="text-xs text-slate-500">Always</span>
        ) : isOwner ? (
          <Toggle checked={givesLessons(m)} disabled={busyUid === m.uid || m.active === false} onChange={(v) => setTeaches(m, v)} label={givesLessons(m) ? 'Yes' : 'No'} />
        ) : (
          <span className="text-xs text-slate-400">{givesLessons(m) ? 'Yes' : 'No'}</span>
        ),
    },
    {
      key: 'active',
      header: 'Active',
      cell: (m) =>
        isOwner && m.uid !== user?.uid ? (
          <Toggle checked={m.active !== false} disabled={busyUid === m.uid} onChange={(v) => update(m, { active: v })} label={m.active !== false ? 'Active' : 'Deactivated'} />
        ) : (
          <Badge tone={m.active !== false ? 'emerald' : 'slate'}>{m.active !== false ? 'Active' : 'Deactivated'}</Badge>
        ),
    },
  ];

  const rc = roleChange;
  const otherOwners = owners.filter((o) => o.uid !== rc?.member.uid);
  const roleMessage = !rc
    ? ''
    : rc.role === 'owner'
      ? `${rc.member.name} will get full access: settings, billing, team and payments. Use this to add a co-owner, or to hand the school over before you leave.`
      : `${rc.member.name} will lose owner access and become ${ROLE_LABEL[rc.role].toLowerCase()}.${otherOwners.length === 0 ? ' They are the only active owner, so this will be refused — make someone else an owner first.' : ''}`;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={isOwner ? 'Owners, office staff and instructors. Switch on “Gives lessons” for owners or staff who also teach.' : 'Only an owner can invite or change team members.'}
        actions={
          isOwner && (
            <Button icon={UserPlus} onClick={() => setInviting(true)}>
              Invite
            </Button>
          )
        }
      />
      <DataTable rows={rows} columns={columns} rowKey={(m) => m.uid} empty={{ icon: Users, title: 'No team members yet' }} />

      {invites.data.length > 0 && (
        <Card className="mt-6 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-bold text-white">Pending invites</h3>
          <ul className="divide-y divide-slate-800">
            {invites.data.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={i.name} className="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{i.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {i.phone} · {ROLE_LABEL[i.role]} · invited {timeAgo(i.createdAt)}
                  </p>
                </div>
                {isOwner && (
                  <Button variant="ghost" size="sm" icon={X} onClick={() => setCancelInvite(i)}>
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isOwner && <OwnershipCard owners={owners} youAreOwner={me?.role === 'owner'} />}

      {inviting && <InviteModal onClose={() => setInviting(false)} />}
      <ConfirmDialog
        open={!!rc}
        onClose={() => setRoleChange(null)}
        danger={rc?.member.role === 'owner'}
        title={rc?.role === 'owner' ? `Make ${rc.member.name} an owner?` : `Remove ${rc?.member.name ?? ''}’s owner access?`}
        message={roleMessage}
        confirmLabel={rc?.role === 'owner' ? 'Make owner' : 'Change role'}
        onConfirm={async () => {
          if (!rc) return;
          // update() shows the error toast; throwing keeps the dialog open.
          if (!(await update(rc.member, { role: rc.role }))) throw new Error('updateMember failed');
        }}
      />
      <ConfirmDialog
        open={!!cancelInvite}
        onClose={() => setCancelInvite(null)}
        danger
        title="Cancel invite?"
        message={`${cancelInvite?.name} won't be added when they sign in.`}
        confirmLabel="Cancel invite"
        onConfirm={async () => {
          try {
            await deleteDoc(doc(db, schoolCol(schoolId, 'invites'), cancelInvite!.id));
            toast.success('Invite cancelled.');
          } catch (err) {
            toast.error(err);
            throw err;
          }
        }}
      />
    </>
  );
}
