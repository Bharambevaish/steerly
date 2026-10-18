import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Timestamp, where } from 'firebase/firestore';
import clsx from 'clsx';
import { CalendarCheck, CheckCircle2, Search, XCircle } from 'lucide-react';
import {
  schoolCol,
  SKILL_LEVEL_LABELS,
  SKILLS,
  type Booking,
  type SkillId,
  type SkillLevel,
  type Slot,
  type Student,
} from '@steerly/shared';
import { call } from '../lib/callables';
import { useLiveCollection, useLiveDoc } from '../lib/hooks';
import { useSchool, useSchoolId } from '../lib/school';
import { addDaysYmd, fmt, fmtTime, istDate, telLink, todayYmd } from '../lib/format';
import { Avatar, Badge, Button, EmptyState, FormField, Input, Select, Skeleton, Textarea, type Tone } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

export const BOOKING_TONE: Record<Booking['status'], Tone> = { booked: 'blue', completed: 'emerald', cancelled: 'slate', no_show: 'red' };
export const BOOKING_LABEL: Record<Booking['status'], string> = { booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };

/** Searchable list of active students. */
export function StudentPicker({ value, onChange }: { value: string | null; onChange: (s: Student) => void }) {
  const schoolId = useSchoolId();
  const { data, loading } = useLiveCollection<Student>(schoolCol(schoolId, 'students'), [where('status', '==', 'active')], 'active');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data
      .filter((x) => !s || x.name.toLowerCase().includes(s) || x.phone.includes(s))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
  }, [data, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student by name or phone…" className="pl-9" />
      </div>
      <div className="scrollbar-thin max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-800 p-1">
        {loading ? (
          <Skeleton className="h-12" />
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">No active students found.</p>
        ) : (
          rows.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s)}
              className={clsx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition', value === s.id ? 'bg-brand/15 ring-1 ring-brand/40' : 'hover:bg-slate-800')}
            >
              <Avatar name={s.name} className="h-8 w-8 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{s.name}</span>
                <span className="block text-xs text-slate-500">
                  {s.courseName} · {s.instructorName ?? 'no instructor'}
                </span>
              </span>
              <span className="text-xs text-slate-500">
                {s.sessionsCompleted}/{s.sessionsTotal}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** Book an open slot for a student. Either the slot or the student is fixed by the caller. */
export function BookSlotModal({ slot, student, onClose }: { slot?: Slot; student?: Student; onClose: () => void }) {
  const schoolId = useSchoolId();
  const { instructors } = useSchool();
  const toast = useToast();
  const [picked, setPicked] = useState<Student | null>(student ?? null);
  const [instructorId, setInstructorId] = useState(student?.instructorId ?? instructors[0]?.uid ?? '');
  const [day, setDay] = useState(todayYmd());
  const [slotId, setSlotId] = useState<string | null>(slot?.id ?? null);
  const [busy, setBusy] = useState(false);

  const from = Timestamp.fromDate(istDate(day));
  const to = Timestamp.fromDate(istDate(addDaysYmd(day, 1)));
  const slots = useLiveCollection<Slot>(slot ? null : schoolCol(schoolId, 'slots'), [where('start', '>=', from), where('start', '<', to)], day);
  const open = slots.data
    .filter((s) => s.status === 'open' && s.instructorId === instructorId && s.start.toMillis() > Date.now())
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());

  const book = async () => {
    if (!picked || !slotId) return;
    setBusy(true);
    try {
      await call('bookSlot', { schoolId, slotId, studentId: picked.id });
      toast.success(`Lesson booked for ${picked.name}.`);
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
      title="Book a lesson"
      description={slot ? `${fmt(slot.start, 'EEE d MMM')} · ${fmtTime(slot.start)}–${fmtTime(slot.end)} with ${slot.instructorName}` : `For ${student?.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={book} loading={busy} disabled={!picked || !slotId} icon={CalendarCheck}>
            Book
          </Button>
        </>
      }
    >
      {slot ? (
        <StudentPicker value={picked?.id ?? null} onChange={setPicked} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Instructor">
              <Select value={instructorId} onChange={(e) => (setInstructorId(e.target.value), setSlotId(null))}>
                {instructors.length === 0 && <option value="">No instructors</option>}
                {instructors.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date">
              <Input type="date" value={day} min={todayYmd()} onChange={(e) => (setDay(e.target.value || todayYmd()), setSlotId(null))} />
            </FormField>
          </div>
          {slots.loading ? (
            <Skeleton className="h-20" />
          ) : open.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 px-3 py-6 text-center text-sm text-slate-500">
              No open slots that day. Generate slots on the Schedule page.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {open.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlotId(s.id)}
                  className={clsx('rounded-xl border px-2 py-2.5 text-sm font-semibold transition', slotId === s.id ? 'border-brand bg-brand/15 text-brand' : 'border-slate-700 text-slate-200 hover:border-slate-500')}
                >
                  {fmtTime(s.start)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Booking details with cancel and complete (attendance, skills, notes). */
export function BookingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const student = useLiveDoc<Student>(`${schoolCol(schoolId, 'students')}/${booking.studentId}`);
  const [mode, setMode] = useState<'view' | 'cancel' | 'complete'>('view');
  const [reason, setReason] = useState('');
  const [attendance, setAttendance] = useState<'present' | 'no_show'>('present');
  const [covered, setCovered] = useState<SkillId[]>([]);
  const [levels, setLevels] = useState<Partial<Record<SkillId, SkillLevel>>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const current = student.data?.skills ?? {};
  const toggleSkill = (id: SkillId) => setCovered((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const cancel = async () => {
    setBusy(true);
    try {
      await call('cancelBooking', { schoolId, bookingId: booking.id, reason: reason.trim() });
      toast.success('Booking cancelled.');
      onClose();
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await call('completeBooking', {
        schoolId,
        bookingId: booking.id,
        attendance,
        skillsCovered: attendance === 'present' ? covered : [],
        skillLevels: attendance === 'present' ? levels : {},
        notes: notes.trim(),
      });
      toast.success(attendance === 'present' ? 'Lesson marked complete.' : 'Marked as no-show.');
      onClose();
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };

  const isBooked = booking.status === 'booked';

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          Lesson · {fmt(booking.start, 'EEE d MMM')} <Badge tone={BOOKING_TONE[booking.status]}>{BOOKING_LABEL[booking.status]}</Badge>
        </span>
      }
      description={`${fmtTime(booking.start)}–${fmtTime(booking.end)} with ${booking.instructorName}`}
      footer={
        mode === 'view' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {isBooked && (
              <>
                <Button variant="danger" icon={XCircle} onClick={() => setMode('cancel')}>
                  Cancel lesson
                </Button>
                <Button icon={CheckCircle2} onClick={() => setMode('complete')}>
                  Mark complete
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setMode('view')} disabled={busy}>
              Back
            </Button>
            {mode === 'cancel' ? (
              <Button variant="danger" onClick={cancel} loading={busy}>
                Cancel booking
              </Button>
            ) : (
              <Button onClick={complete} loading={busy}>
                Save
              </Button>
            )}
          </>
        )
      }
    >
      {mode === 'view' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 p-3">
            <Avatar name={booking.studentName} />
            <div className="min-w-0 flex-1">
              <Link to={`/students/${booking.studentId}`} onClick={onClose} className="block truncate font-semibold text-white hover:text-brand">
                {booking.studentName}
              </Link>
              <a href={telLink(booking.studentPhone)} className="font-mono text-xs text-slate-400 hover:text-white">
                +91 {booking.studentPhone}
              </a>
            </div>
          </div>
          {booking.status === 'cancelled' && booking.cancelReason && <p className="text-sm text-slate-400">Reason: {booking.cancelReason}</p>}
          {booking.skillsCovered?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-400">Skills covered</p>
              <div className="flex flex-wrap gap-1.5">
                {booking.skillsCovered.map((id) => (
                  <Badge key={id}>{SKILLS.find((s) => s.id === id)?.label ?? id}</Badge>
                ))}
              </div>
            </div>
          )}
          {booking.instructorNotes && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-400">Instructor notes</p>
              <p className="whitespace-pre-wrap text-sm text-slate-200">{booking.instructorNotes}</p>
            </div>
          )}
          {booking.rating != null && (
            <p className="text-sm text-slate-300">
              Student rating: <span className="font-bold text-brand">{'★'.repeat(booking.rating)}</span>
              {booking.feedback && <span className="text-slate-400"> — “{booking.feedback}”</span>}
            </p>
          )}
          {isBooked && booking.start.toMillis() > Date.now() && <p className="text-xs text-slate-500">Upcoming lesson. You can cancel it or mark it complete after it happens.</p>}
        </div>
      )}

      {mode === 'cancel' && (
        <FormField label="Reason (shared with the student)">
          <Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Instructor unwell, vehicle in service…" />
        </FormField>
      )}

      {mode === 'complete' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(['present', 'no_show'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAttendance(a)}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                  attendance === a ? (a === 'present' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-red-500 bg-red-500/15 text-red-300') : 'border-slate-700 text-slate-300',
                )}
              >
                {a === 'present' ? 'Present' : 'No-show'}
              </button>
            ))}
          </div>
          {attendance === 'present' && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-300">Skills covered & new level</p>
              <div className="space-y-1.5">
                {SKILLS.map((s) => {
                  const on = covered.includes(s.id);
                  const lvl = levels[s.id] ?? current[s.id] ?? 0;
                  return (
                    <div key={s.id} className={clsx('flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2', on ? 'border-brand/40 bg-brand/5' : 'border-slate-800')}>
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" checked={on} onChange={() => toggleSkill(s.id)} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                        {s.label}
                      </label>
                      <Select
                        value={String(lvl)}
                        onChange={(e) => {
                          const v = Number(e.target.value) as SkillLevel;
                          setLevels((x) => ({ ...x, [s.id]: v }));
                          if (!on) toggleSkill(s.id);
                        }}
                        className="w-36 py-1.5 text-xs"
                      >
                        {([0, 1, 2, 3] as SkillLevel[]).map((l) => (
                          <option key={l} value={l}>
                            {SKILL_LEVEL_LABELS[l]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <FormField label="Notes for the student">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Good clutch control today. Practise reverse parking." />
          </FormField>
        </div>
      )}
    </Modal>
  );
}

export function BookingList({ rows, loading, onOpen, emptyText }: { rows: Booking[]; loading: boolean; onOpen: (b: Booking) => void; emptyText: string }) {
  if (loading)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  if (!rows.length) return <EmptyState icon={CalendarCheck} title={emptyText} className="py-8" />;
  return (
    <ul className="space-y-2">
      {rows.map((b) => (
        <li key={b.id}>
          <button type="button" onClick={() => onOpen(b)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-left transition hover:border-slate-700">
            <div className="w-20 shrink-0">
              <p className="text-sm font-bold text-white">{fmt(b.start, 'd MMM')}</p>
              <p className="text-xs text-slate-500">{fmtTime(b.start)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{b.instructorName}</p>
              {b.instructorNotes && <p className="truncate text-xs text-slate-500">{b.instructorNotes}</p>}
            </div>
            <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_LABEL[b.status]}</Badge>
          </button>
        </li>
      ))}
    </ul>
  );
}
