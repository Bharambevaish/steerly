import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import clsx from 'clsx';
import { Check, Copy, CreditCard, ExternalLink, ImageUp, MessageCircle, Save, Share2, Trash2 } from 'lucide-react';
import { COLLECTIONS, DEFAULT_SCHOOL_SETTINGS, PLANS, phoneSchema, schoolLogoPath, type PlanId, type School, type SchoolSettings } from '@steerly/shared';
import { db, storage } from '../lib/firebase';
import { call } from '../lib/callables';
import { useSchool, useSchoolId } from '../lib/school';
import { copyText, daysUntil, fmt, formatINR, PUBLIC_SITE_URL, waShareLink } from '../lib/format';
import { Badge, Button, Card, FormField, Input, PageHeader, Select, Textarea, type Tone } from '../components/ui';
import { useToast } from '../components/Toast';
import { Logo } from '../components/Logo';
import { useAuth } from '../auth/AuthProvider';

const SWATCHES = ['#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#84CC16'];
const STATUS_TONE: Record<string, Tone> = { trial: 'brand', active: 'emerald', past_due: 'amber', suspended: 'red' };

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24 p-4 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {description && <p className="text-sm text-slate-400">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function ProfileSection({ school, readOnly }: { school: School; readOnly: boolean }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [f, setF] = useState({ name: school.name, phone: school.phone, email: school.email ?? '', address: school.address, city: school.city, brandColor: school.brandColor || '#F59E0B' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const phone = phoneSchema.safeParse(f.phone);
    if (f.name.trim().length < 2) return toast.error('Enter the school name.');
    if (!phone.success) return toast.error('Enter a valid 10-digit phone.');
    if (!/^#[0-9a-fA-F]{6}$/.test(f.brandColor)) return toast.error('Brand colour must be a hex like #F59E0B.');
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.schools, schoolId), {
        name: f.name.trim(),
        phone: phone.data,
        email: f.email.trim() || null,
        address: f.address.trim(),
        city: f.city.trim(),
        brandColor: f.brandColor.toUpperCase(),
      });
      toast.success('School profile saved.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (img: File) => {
    if (!img.type.startsWith('image/')) return toast.error('Pick an image file.');
    if (img.size >= 2 * 1024 * 1024) return toast.error('Logo must be under 2 MB.');
    setUploading(true);
    try {
      const r = storageRef(storage, schoolLogoPath(schoolId));
      await uploadBytes(r, img, { contentType: img.type, cacheControl: 'public, max-age=300' });
      const url = await getDownloadURL(r);
      await updateDoc(doc(db, COLLECTIONS.schools, schoolId), { logoUrl: url });
      toast.success('Logo updated.');
    } catch (err) {
      toast.error(err);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  };

  return (
    <Section title="School profile" description={readOnly ? 'Only the owner can edit these.' : 'Shown in the student app, on receipts and on your public page.'}>
      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-4">
          {school.logoUrl ? <img src={school.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <Logo className="h-16 w-16" />}
          <div>
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            <Button variant="secondary" size="sm" icon={ImageUp} loading={uploading} disabled={readOnly} onClick={() => file.current?.click()}>
              Upload logo
            </Button>
            <p className="mt-1 text-xs text-slate-500">Square PNG/JPG, under 2 MB.</p>
          </div>
        </div>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
          <FormField label="School name">
            <Input value={f.name} onChange={set('name')} required />
          </FormField>
          <FormField label="Phone">
            <Input type="tel" value={f.phone} onChange={set('phone')} required />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={f.email} onChange={set('email')} />
          </FormField>
          <FormField label="City">
            <Input value={f.city} onChange={set('city')} />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <Textarea value={f.address} onChange={set('address')} rows={2} />
          </FormField>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-300">Brand colour</p>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setF((x) => ({ ...x, brandColor: c }))}
                  className={clsx('flex h-9 w-9 items-center justify-center rounded-xl ring-offset-2 ring-offset-slate-900 transition', f.brandColor.toUpperCase() === c && 'ring-2 ring-white')}
                  style={{ background: c }}
                >
                  {f.brandColor.toUpperCase() === c && <Check className="h-4 w-4 text-slate-950" />}
                </button>
              ))}
              <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-2 py-1">
                <input type="color" value={f.brandColor} onChange={set('brandColor')} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent" />
                <input value={f.brandColor} onChange={set('brandColor')} className="w-20 bg-transparent font-mono text-xs text-slate-200 focus:outline-none" />
              </label>
            </div>
          </div>
        </fieldset>
        {!readOnly && (
          <div className="flex justify-end">
            <Button type="submit" loading={busy} icon={Save}>
              Save profile
            </Button>
          </div>
        )}
      </form>
    </Section>
  );
}

function SettingsSection({ school, readOnly }: { school: School; readOnly: boolean }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const s: SchoolSettings = { ...DEFAULT_SCHOOL_SETTINGS, ...(school.settings ?? {}) };
  const [f, setF] = useState({
    lessonMinutes: String(s.lessonMinutes),
    cancelBeforeHours: String(s.cancelBeforeHours),
    maxBookingsPerDay: String(s.maxBookingsPerDay),
    bookingWindowDays: String(s.bookingWindowDays),
    gstin: s.gstin ?? '',
    gstPercent: String(s.gstPercent),
    upiId: s.upiId ?? '',
    receiptPrefix: s.receiptPrefix,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const int = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const gstin = f.gstin.trim().toUpperCase();
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) return toast.error('GSTIN should be 15 characters.');
    const prefix = f.receiptPrefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(prefix)) return toast.error('Receipt prefix: 2–6 letters or digits.');
    const upi = f.upiId.trim();
    if (upi && !/^[\w.-]+@[\w.-]+$/.test(upi)) return toast.error('UPI ID looks like name@bank.');
    const settings: SchoolSettings = {
      lessonMinutes: int(f.lessonMinutes, 15, 240),
      cancelBeforeHours: int(f.cancelBeforeHours, 0, 168),
      maxBookingsPerDay: int(f.maxBookingsPerDay, 1, 10),
      bookingWindowDays: int(f.bookingWindowDays, 1, 90),
      gstin: gstin || null,
      gstPercent: Number(f.gstPercent) === 18 ? 18 : 0,
      upiId: upi || null,
      receiptPrefix: prefix,
    };
    setBusy(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.schools, schoolId), { settings });
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Booking & receipts" description="Rules for student self-booking, and what appears on receipts.">
      <form onSubmit={save}>
        <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Lesson length (min)">
            <Input type="number" min={15} step={15} value={f.lessonMinutes} onChange={set('lessonMinutes')} />
          </FormField>
          <FormField label="Cancel up to (hours before)">
            <Input type="number" min={0} value={f.cancelBeforeHours} onChange={set('cancelBeforeHours')} />
          </FormField>
          <FormField label="Max lessons / day / student">
            <Input type="number" min={1} value={f.maxBookingsPerDay} onChange={set('maxBookingsPerDay')} />
          </FormField>
          <FormField label="Book ahead (days)">
            <Input type="number" min={1} value={f.bookingWindowDays} onChange={set('bookingWindowDays')} />
          </FormField>
          <FormField label="GSTIN" hint="Leave empty if not registered">
            <Input value={f.gstin} onChange={set('gstin')} placeholder="27ABCDE1234F1Z5" maxLength={15} />
          </FormField>
          <FormField label="GST">
            <Select value={f.gstPercent} onChange={set('gstPercent')}>
              <option value="0">No GST</option>
              <option value="18">18% (inclusive)</option>
            </Select>
          </FormField>
          <FormField label="UPI ID" hint="Shown to students for direct UPI">
            <Input value={f.upiId} onChange={set('upiId')} placeholder="school@okhdfc" />
          </FormField>
          <FormField label="Receipt prefix" hint="e.g. PDS-2026-00042">
            <Input value={f.receiptPrefix} onChange={set('receiptPrefix')} maxLength={6} />
          </FormField>
        </fieldset>
        {!readOnly && (
          <div className="mt-5 flex justify-end">
            <Button type="submit" loading={busy} icon={Save}>
              Save settings
            </Button>
          </div>
        )}
      </form>
    </Section>
  );
}

function ShareSection({ school }: { school: School }) {
  const toast = useToast();
  const link = `${PUBLIC_SITE_URL}/s/${school.slug}`;
  const copy = async (text: string, what: string) => ((await copyText(text)) ? toast.success(`${what} copied.`) : toast.error('Copy failed.'));
  const message = `Learn driving with ${school.name}! See courses and enquire: ${link} — or download the Steerly app and join with code ${school.code}.`;

  return (
    <Section title="Invite students" description="Students join your school in the Steerly app with this code, or enquire from your public page.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Join code</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="font-mono text-3xl font-black tracking-[0.3em] text-white">{school.code}</p>
            <Button variant="secondary" size="sm" icon={Copy} onClick={() => copy(school.code, 'Code')}>
              Copy
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Public page</p>
          <p className="mt-1 truncate font-mono text-sm text-slate-200">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Copy} onClick={() => copy(link, 'Link')}>
              Copy link
            </Button>
            <a href={waShareLink(message)} target="_blank" rel="noreferrer">
              <Button variant="success" size="sm" icon={MessageCircle}>
                WhatsApp
              </Button>
            </a>
            {'share' in navigator && (
              <Button variant="ghost" size="sm" icon={Share2} onClick={() => navigator.share({ title: school.name, text: message, url: link }).catch(() => undefined)}>
                Share
              </Button>
            )}
            <a href={link} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" icon={ExternalLink}>
                Open
              </Button>
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

function BillingSection({ school, readOnly }: { school: School; readOnly: boolean }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const sub = school.subscription;
  const trialLeft = daysUntil(sub?.trialEndsAt);

  const choose = async (plan: PlanId) => {
    const win = window.open('', '_blank');
    if (win) win.opener = null; // no link back to the dashboard (reverse tabnabbing)
    setBusy(plan);
    try {
      const { url } = await call('startSubscription', { schoolId, plan });
      if (win) win.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      win?.close();
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section id="billing" title="Billing" description="Your Steerly subscription.">
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-slate-900/70 p-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Plan</p>
          <p className="font-bold text-white">{PLANS[sub?.plan ?? 'starter']?.name ?? sub?.plan}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <Badge tone={STATUS_TONE[sub?.status ?? 'trial'] ?? 'slate'}>{(sub?.status ?? 'trial').replace('_', ' ')}</Badge>
        </div>
        {sub?.status === 'trial' && sub.trialEndsAt && (
          <div>
            <p className="text-xs text-slate-500">Trial ends</p>
            <p className="font-semibold text-white">
              {fmt(sub.trialEndsAt)} {trialLeft != null && trialLeft >= 0 && <span className="text-slate-400">({trialLeft} days)</span>}
            </p>
          </div>
        )}
        {sub?.currentPeriodEnd && (
          <div>
            <p className="text-xs text-slate-500">Renews</p>
            <p className="font-semibold text-white">{fmt(sub.currentPeriodEnd)}</p>
          </div>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const current = sub?.plan === id && sub.status === 'active';
          return (
            <div key={id} className={clsx('flex flex-col rounded-2xl border p-4', id === 'pro' ? 'border-brand/40 bg-brand/5' : 'border-slate-800')}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">{p.name}</p>
                {id === 'pro' && <Badge tone="brand">Popular</Badge>}
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                {formatINR(p.priceMonthly)}
                <span className="text-sm font-normal text-slate-500">/month</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-400">
                <li>Up to {p.maxStudents.toLocaleString('en-IN')} students</li>
                <li>Unlimited leads, bookings & receipts</li>
                {p.whiteLabel && <li className="text-brand">Your own branded app</li>}
              </ul>
              <Button className="mt-4 w-full" variant={id === 'pro' ? 'primary' : 'secondary'} icon={CreditCard} disabled={readOnly || current || !!busy} loading={busy === id} onClick={() => choose(id)}>
                {current ? 'Current plan' : 'Choose'}
              </Button>
            </div>
          );
        })}
      </div>
      {readOnly && <p className="mt-3 text-xs text-slate-500">Only the owner can change the plan.</p>}
    </Section>
  );
}

function DeleteAccountSection({ schoolName }: { schoolName: string }) {
  const { role, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwnerRole = role === 'owner';
  const blocked = isOwnerRole || role === 'superAdmin';

  const run = async (e: FormEvent) => {
    e.preventDefault();
    if (blocked || confirm.trim() !== 'DELETE') return;
    setBusy(true);
    try {
      await call('deleteMyAccount', { confirm: 'DELETE' });
    } catch (err) {
      // Server messages (e.g. "Transfer ownership first…") are shown as-is.
      toast.error(err, 'Couldn’t delete your account. Please try again.');
      setBusy(false);
      return;
    }
    // The Auth user is gone; signing out just clears local state.
    await signOut().catch(() => {});
    toast.success('Your account has been deleted.');
    navigate('/login', { replace: true });
  };

  return (
    <Section id="delete-account" title="Delete my account" description="Removes your Steerly login. This can’t be undone.">
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1.5 font-semibold text-white">What we delete</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>Your login (phone number / email) and profile</li>
            <li>Your notifications inbox</li>
            <li>Your access to {schoolName}</li>
          </ul>
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-white">What {schoolName} keeps</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>Students, payments and receipts (required by tax law)</li>
            <li>Lesson history you recorded or taught</li>
            <li>Your name on past records</li>
          </ul>
        </div>
      </div>
      {blocked ? (
        <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {isOwnerRole ? (
            <>
              You’re an owner. Transfer ownership first: make another member an owner on the{' '}
              <Link to="/team" className="font-semibold underline">
                Team page
              </Link>
              , then ask them to change your role.
            </>
          ) : (
            'Super-admin accounts can’t be deleted here. Remove the administrator role first.'
          )}
        </p>
      ) : null}
      <form onSubmit={run} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField label="Type DELETE to confirm" className="sm:w-64">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" autoComplete="off" disabled={blocked || busy} />
        </FormField>
        <Button type="submit" variant="danger" icon={Trash2} loading={busy} disabled={blocked || confirm.trim() !== 'DELETE'}>
          Permanently delete my account
        </Button>
      </form>
    </Section>
  );
}

export default function SettingsPage() {
  const { school, isOwner } = useSchool();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, school?.id]);

  if (!school) return null;
  return (
    <>
      <PageHeader title="Settings" subtitle={school.name} />
      <div className="space-y-6">
        <ProfileSection key={`p-${school.id}`} school={school} readOnly={!isOwner} />
        <ShareSection school={school} />
        <SettingsSection key={`s-${school.id}`} school={school} readOnly={!isOwner} />
        <BillingSection school={school} readOnly={!isOwner} />
        <DeleteAccountSection schoolName={school.name} />
      </div>
    </>
  );
}
