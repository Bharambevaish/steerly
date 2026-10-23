import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { addDoc, collection, doc, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import clsx from 'clsx';
import { CalendarClock, MessageCircle, Phone, Plus, StickyNote, UserCheck, UserPlus } from 'lucide-react';
import { PREFERRED_TIMES, phoneSchema, schoolCol, type EnquiryDoc, type EnquirySource, type EnquiryStatusV2 } from '@steerly/shared';
import { db } from '../lib/firebase';
import { call } from '../lib/callables';
import { useLiveCollection } from '../lib/hooks';
import { useSchool, useSchoolId } from '../lib/school';
import { fmt, SOURCE_LABELS, telLink, timeAgo, todayYmd, tsToYmd, waLink, ymdToTs } from '../lib/format';
import { useNow } from '../lib/useNow';
import { Badge, Button, EmptyState, FormField, Input, PageHeader, SearchInput, Select, Skeleton, Tabs, Textarea, type Tone } from '../components/ui';
import { Drawer, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { EnrolFields } from '../components/StudentFormFields';
import { enrolPayload, initialEnrol, type EnrolValues } from '../lib/enrol';

const STATUSES: EnquiryStatusV2[] = ['New', 'Contacted', 'Enrolled', 'Lost'];
const STATUS_TONE: Record<EnquiryStatusV2, Tone> = { New: 'brand', Contacted: 'blue', Enrolled: 'emerald', Lost: 'slate' };
const MANUAL_SOURCES: EnquirySource[] = ['walk_in', 'phone', 'referral', 'web', 'app'];

/** Open lead whose follow-up date (IST calendar day) is today or earlier. */
const followUpDue = (e: EnquiryDoc, today: string) => !!e.followUpAt && e.status !== 'Enrolled' && e.status !== 'Lost' && tsToYmd(e.followUpAt) <= today;

function ConvertModal({ lead, onClose }: { lead: EnquiryDoc; onClose: () => void }) {
  const schoolId = useSchoolId();
  const { courses } = useSchool();
  const toast = useToast();
  const navigate = useNavigate();
  const [enrol, setEnrol] = useState<EnrolValues>(() => initialEnrol(courses, lead.courseId));
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrol.courseId) return toast.error('Pick a course.');
    setBusy(true);
    try {
      const { studentId } = await call('convertEnquiry', { schoolId, enquiryId: lead.id, ...enrolPayload(enrol) });
      toast.success(`${lead.name} is now a student.`);
      onClose();
      navigate(`/students/${studentId}`);
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Convert ${lead.name} to student`}
      description={`+91 ${lead.phone} · they can sign in to the app with this number.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="convert-form" loading={busy} icon={UserCheck}>
            Convert
          </Button>
        </>
      }
    >
      <form id="convert-form" onSubmit={submit}>
        <EnrolFields value={enrol} onChange={setEnrol} />
      </form>
    </Modal>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const schoolId = useSchoolId();
  const { courses } = useSchool();
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', courseId: '', preferredTime: 'Flexible', source: 'walk_in' as EnquirySource, notes: '', followUp: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const phone = phoneSchema.safeParse(f.phone);
    if (!f.name.trim()) return toast.error('Enter a name.');
    if (!phone.success) return toast.error('Enter a valid 10-digit mobile number.');
    const course = courses.find((c) => c.id === f.courseId);
    setBusy(true);
    try {
      await addDoc(collection(db, schoolCol(schoolId, 'enquiries')), {
        name: f.name.trim().slice(0, 80),
        phone: phone.data,
        courseId: course?.id ?? null,
        courseName: course?.name ?? '',
        preferredTime: f.preferredTime,
        source: f.source,
        status: 'New',
        notes: f.notes.trim(),
        followUpAt: ymdToTs(f.followUp, '10:00'),
        studentId: null,
        createdAt: serverTimestamp(),
        updatedAt: null,
      });
      toast.success('Lead added.');
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
      title="Add a lead"
      description="Walk-in, phone call or referral."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="lead-form" loading={busy}>
            Add lead
          </Button>
        </>
      }
    >
      <form id="lead-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name">
          <Input autoFocus value={f.name} onChange={set('name')} required maxLength={80} />
        </FormField>
        <FormField label="Mobile">
          <Input type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} required placeholder="10 digits" />
        </FormField>
        <FormField label="Course">
          <Select value={f.courseId} onChange={set('courseId')}>
            <option value="">Not sure yet</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Preferred time">
          <Select value={f.preferredTime} onChange={set('preferredTime')}>
            {PREFERRED_TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Source">
          <Select value={f.source} onChange={set('source')}>
            {MANUAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Follow up on">
          <Input type="date" value={f.followUp} onChange={set('followUp')} />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <Textarea value={f.notes} onChange={set('notes')} rows={3} />
        </FormField>
      </form>
    </Modal>
  );
}

function LeadDrawer({ lead, onClose, onConvert }: { lead: EnquiryDoc; onClose: () => void; onConvert: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [followUp, setFollowUp] = useState(tsToYmd(lead.followUpAt));
  const [busy, setBusy] = useState(false);
  const ref = doc(db, schoolCol(schoolId, 'enquiries'), lead.id);

  const save = async () => {
    setBusy(true);
    try {
      await updateDoc(ref, { notes: notes.trim(), followUpAt: ymdToTs(followUp, '10:00'), updatedAt: serverTimestamp() });
      toast.success('Saved.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: EnquiryStatusV2) => {
    try {
      await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={lead.name}
      description={`${SOURCE_LABELS[lead.source] ?? lead.source} lead · ${fmt(lead.createdAt, 'd MMM yyyy, h:mm a')}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-2">
          <a href={telLink(lead.phone)} className="flex-1">
            <Button variant="secondary" className="w-full" icon={Phone}>
              Call
            </Button>
          </a>
          <a href={waLink(lead.phone, `Hi ${lead.name.split(' ')[0]}, thanks for your enquiry!`)} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="success" className="w-full" icon={MessageCircle}>
              WhatsApp
            </Button>
          </a>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Phone</dt>
            <dd className="font-mono text-white">+91 {lead.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Preferred time</dt>
            <dd className="text-white">{lead.preferredTime}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Course</dt>
            <dd className="text-white">{lead.courseName || '—'}</dd>
          </div>
        </dl>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-300">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.filter((s) => s !== 'Enrolled' || lead.status === 'Enrolled').map((s) => (
              <button
                key={s}
                type="button"
                disabled={lead.status === 'Enrolled'}
                onClick={() => setStatus(s)}
                className={clsx(
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed',
                  lead.status === s ? 'bg-brand text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <FormField label="Follow-up date">
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Called, wants weekend classes…" />
        </FormField>
        {lead.status !== 'Enrolled' && (
          <Button className="w-full" icon={UserCheck} onClick={onConvert}>
            Convert to student
          </Button>
        )}
      </div>
    </Drawer>
  );
}

export default function LeadsPage() {
  const schoolId = useSchoolId();
  const navigate = useNavigate();
  const { data, loading } = useLiveCollection<EnquiryDoc>(schoolCol(schoolId, 'enquiries'), [orderBy('createdAt', 'desc')], 'createdAt');
  const [tab, setTab] = useState<'All' | EnquiryStatusV2 | 'FollowUp'>('All');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const today = todayYmd(useNow());

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: data.length, FollowUp: 0 };
    STATUSES.forEach((s) => (c[s] = 0));
    data.forEach((e) => {
      c[e.status] = (c[e.status] ?? 0) + 1;
      if (followUpDue(e, today)) c.FollowUp!++;
    });
    return c;
  }, [data, today]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((e) => {
      if (tab === 'FollowUp') {
        if (!followUpDue(e, today)) return false;
      } else if (tab !== 'All' && e.status !== tab) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.phone.includes(q) || (e.courseName ?? '').toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q);
    });
  }, [data, tab, search, today]);

  const openLead = data.find((e) => e.id === openId) ?? null;
  const convertLead = data.find((e) => e.id === convertId) ?? null;

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Enquiries from your app, website and walk-ins. Updates live."
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Add lead
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          className="flex-1"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'All', label: 'All', count: counts.All },
            ...STATUSES.map((s) => ({ id: s, label: s, count: counts[s] })),
            { id: 'FollowUp' as const, label: 'Follow-up due', count: counts.FollowUp, icon: CalendarClock },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, course…" className="lg:w-72" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={data.length === 0 ? 'No leads yet' : 'Nothing matches'}
          description={data.length === 0 ? 'Share your school page or app code — enquiries land here instantly. You can also add walk-ins yourself.' : 'Try a different tab or search.'}
          action={data.length === 0 && <Button icon={Plus} onClick={() => setAdding(true)}>Add lead</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((e) => {
            const due = followUpDue(e, today);
            return (
              <div
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="card flex cursor-pointer flex-col gap-4 p-4 transition hover:border-slate-700 sm:p-5 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-white">{e.name}</h3>
                    <Badge tone={STATUS_TONE[e.status]} dot>
                      {e.status}
                    </Badge>
                    <Badge>{SOURCE_LABELS[e.source] ?? e.source}</Badge>
                    <span className="text-xs text-slate-500">{timeAgo(e.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span className="font-mono text-slate-300">+91 {e.phone}</span>
                    {e.courseName && <span>{e.courseName}</span>}
                    <span>{e.preferredTime}</span>
                    {e.followUpAt && e.status !== 'Enrolled' && (
                      <span className={clsx('inline-flex items-center gap-1', due ? 'font-semibold text-amber-300' : '')}>
                        <CalendarClock className="h-3.5 w-3.5" /> Follow up {fmt(e.followUpAt, 'd MMM')}
                      </span>
                    )}
                  </div>
                  {e.notes && (
                    <p className="flex items-start gap-1.5 text-sm text-slate-500">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{e.notes}</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                  <a href={telLink(e.phone)} aria-label="Call" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href={waLink(e.phone, `Hi ${e.name.split(' ')[0]}, thanks for your enquiry!`)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  {e.status === 'Enrolled' ? (
                    e.studentId && (
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/students/${e.studentId}`)}>
                        View student
                      </Button>
                    )
                  ) : (
                    <Button size="sm" icon={UserCheck} onClick={() => setConvertId(e.id)}>
                      Convert
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openLead && <LeadDrawer key={openLead.id} lead={openLead} onClose={() => setOpenId(null)} onConvert={() => setConvertId(openLead.id)} />}
      {convertLead && <ConvertModal lead={convertLead} onClose={() => setConvertId(null)} />}
      {adding && <AddLeadModal onClose={() => setAdding(false)} />}
    </>
  );
}
