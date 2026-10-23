import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import clsx from 'clsx';
import { formatInTimeZone } from 'date-fns-tz';
import { Ban, CalendarCog, CalendarPlus, ChevronLeft, ChevronRight, Clock, Copy, Plus, Sparkles, Trash2, Unlock, Users, X } from 'lucide-react';
import { schoolCol, TIMEZONE, type Availability, type Booking, type Slot, type TimeRange, type Vehicle, type Weekday } from '@steerly/shared';
import { db } from '../lib/firebase';
import { call } from '../lib/callables';
import { useLiveCollection, useLiveDoc } from '../lib/hooks';
import { instructorLabel, useSchool, useSchoolId } from '../lib/school';
import { useNow } from '../lib/useNow';
import { addDaysYmd, fmt, fmtTime, istDate, todayYmd, weekStartYmd, ymdLabel } from '../lib/format';
import { Button, Card, EmptyState, FormField, IconButton, Input, PageHeader, Select, Skeleton, Tabs } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { BookingModal, BookSlotModal } from '../components/BookingDialogs';
import { BOOKING_LABEL } from '../lib/labels';

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
];

const emptyWeek = (): Record<Weekday, TimeRange[]> => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

// ---------- Availability ----------

function AvailabilityEditor({ instructorId }: { instructorId: string }) {
  const schoolId = useSchoolId();
  const path = `${schoolCol(schoolId, 'availability')}/${instructorId}`;
  const { data, loading } = useLiveDoc<Availability & { id: string }>(path);
  if (loading) return <Skeleton className="h-96" />;
  // The form owns its draft once loaded; saving doesn't reset it (parent keys this by instructor).
  return <AvailabilityForm path={path} instructorId={instructorId} initial={data} />;
}

function AvailabilityForm({ path, instructorId, initial }: { path: string; instructorId: string; initial: Availability | null }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const vehicles = useLiveCollection<Vehicle>(schoolCol(schoolId, 'vehicles'));
  const [weekly, setWeekly] = useState<Record<Weekday, TimeRange[]>>(() => ({ ...emptyWeek(), ...(initial?.weekly ?? {}) }));
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? '');
  const [busy, setBusy] = useState(false);

  const update = (day: Weekday, i: number, patch: Partial<TimeRange>) =>
    setWeekly((w) => ({ ...w, [day]: w[day].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const add = (day: Weekday) => setWeekly((w) => ({ ...w, [day]: [...w[day], w[day].length ? { start: '16:00', end: '19:00' } : { start: '07:00', end: '11:00' }] }));
  const remove = (day: Weekday, i: number) => setWeekly((w) => ({ ...w, [day]: w[day].filter((_, j) => j !== i) }));
  const copyMonToWeekdays = () => setWeekly((w) => ({ ...w, tue: [...w.mon], wed: [...w.mon], thu: [...w.mon], fri: [...w.mon], sat: [...w.mon] }));

  const save = async () => {
    for (const d of WEEKDAYS) {
      const ranges = [...weekly[d.id]].sort((a, b) => a.start.localeCompare(b.start));
      for (const [i, r] of ranges.entries()) {
        if (!r.start || !r.end || r.start >= r.end) return toast.error(`${d.label}: end time must be after start time.`);
        if (i > 0 && r.start < ranges[i - 1]!.end) return toast.error(`${d.label}: time ranges overlap.`);
      }
    }
    setBusy(true);
    try {
      const sorted = Object.fromEntries(WEEKDAYS.map((d) => [d.id, [...weekly[d.id]].sort((a, b) => a.start.localeCompare(b.start))]));
      await setDoc(doc(db, path), { instructorId, weekly: sorted, vehicleId: vehicleId || null, updatedAt: serverTimestamp() });
      toast.success('Availability saved. Generate slots to open them for booking.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Weekly working hours</h3>
          <p className="text-xs text-slate-500">School time (IST). Slots are cut from these ranges using the lesson length in Settings.</p>
        </div>
        <FormField label="Default vehicle" className="sm:w-56">
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">None</option>
            {vehicles.data.filter((v) => v.active !== false || v.id === vehicleId).map((v) => (
              <option key={v.id} value={v.id}>
                {v.regNumber} {v.model && `· ${v.model}`}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="divide-y divide-slate-800">
        {WEEKDAYS.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
            <p className="w-28 shrink-0 pt-2 text-sm font-semibold text-slate-200">{d.label}</p>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {weekly[d.id].length === 0 && <span className="pt-2 text-sm text-slate-600">Off</span>}
              {weekly[d.id].map((r, i) => (
                <div key={i} className="flex max-w-full items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
                  <input type="time" value={r.start} step={900} onChange={(e) => update(d.id, i, { start: e.target.value })} className="rounded-lg bg-transparent px-1.5 py-1 text-sm text-white focus:outline-none" />
                  <span className="text-slate-500">–</span>
                  <input type="time" value={r.end} step={900} onChange={(e) => update(d.id, i, { end: e.target.value })} className="rounded-lg bg-transparent px-1.5 py-1 text-sm text-white focus:outline-none" />
                  <button type="button" aria-label="Remove range" onClick={() => remove(d.id, i)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-red-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" icon={Plus} onClick={() => add(d.id)}>
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" icon={Copy} onClick={copyMonToWeekdays} disabled={!weekly.mon.length}>
          Copy Monday to Tue–Sat
        </Button>
        <Button onClick={save} loading={busy}>
          Save availability
        </Button>
      </div>
    </Card>
  );
}

// ---------- Generate slots ----------

function GenerateModal({ instructorId, instructorName, onClose }: { instructorId: string; instructorName: string; onClose: () => void }) {
  const schoolId = useSchoolId();
  const { instructors } = useSchool();
  const toast = useToast();
  const [from, setFrom] = useState(todayYmd());
  const [to, setTo] = useState(addDaysYmd(todayYmd(), 13));
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (to < from) return toast.error('End date must be after start date.');
    if (to > addDaysYmd(from, 31)) return toast.error('Generate at most 31 days at a time.');
    setBusy(true);
    try {
      const ids = all ? instructors.map((i) => i.uid) : [instructorId];
      let created = 0;
      let skipped = 0;
      for (const id of ids) {
        const r = await call('generateSlots', { schoolId, instructorId: id, from, to });
        created += r.created;
        skipped += r.skipped;
      }
      toast.success(`${created} slots created${skipped ? `, ${skipped} already existed` : ''}.`);
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
      title="Generate slots"
      description="Creates bookable slots from weekly availability. Safe to run again — existing slots are kept."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="gen-form" loading={busy} icon={Sparkles}>
            Generate
          </Button>
        </>
      }
    >
      <form id="gen-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From">
            <Input type="date" value={from} min={todayYmd()} onChange={(e) => setFrom(e.target.value)} required />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} min={from} max={addDaysYmd(from, 31)} onChange={(e) => setTo(e.target.value)} required />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />
          Everyone who gives lessons ({instructors.length}) instead of only {instructorName}
        </label>
      </form>
    </Modal>
  );
}

// ---------- Slot actions ----------

function SlotModal({ slot, onClose, onBook }: { slot: Slot; onClose: () => void; onBook: () => void }) {
  const schoolId = useSchoolId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const now = useNow();
  const ref = doc(db, schoolCol(schoolId, 'slots'), slot.id);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onClose();
    } catch (err) {
      toast.error(err);
      setBusy(false);
    }
  };
  const past = slot.start.toMillis() < now;

  return (
    <Modal open onClose={onClose} size="sm" title={`${fmt(slot.start, 'EEE d MMM')} · ${fmtTime(slot.start)}–${fmtTime(slot.end)}`} description={`${slot.instructorName} · ${slot.status === 'open' ? 'Open' : 'Blocked'}`}>
      <div className="grid gap-2">
        {slot.status === 'open' && (
          <Button icon={CalendarPlus} onClick={onBook} disabled={past}>
            Book for a student
          </Button>
        )}
        {slot.status === 'open' ? (
          <Button variant="secondary" icon={Ban} loading={busy} onClick={() => run(() => updateDoc(ref, { status: 'blocked' }), 'Slot blocked.')}>
            Block slot
          </Button>
        ) : (
          <Button variant="secondary" icon={Unlock} loading={busy} onClick={() => run(() => updateDoc(ref, { status: 'open' }), 'Slot reopened.')}>
            Unblock slot
          </Button>
        )}
        <Button variant="danger" icon={Trash2} disabled={busy} onClick={() => run(() => deleteDoc(ref), 'Slot deleted.')}>
          Delete slot
        </Button>
        {past && <p className="text-xs text-slate-500">This slot is in the past.</p>}
      </div>
    </Modal>
  );
}

// ---------- Week calendar ----------

const hourOf = (ts: Slot['start']) => Number(formatInTimeZone(ts.toDate(), TIMEZONE, 'H'));
const ymdOf = (ts: Slot['start']) => formatInTimeZone(ts.toDate(), TIMEZONE, 'yyyy-MM-dd');

function WeekCalendar({ instructorId }: { instructorId: string }) {
  const schoolId = useSchoolId();
  const [week, setWeek] = useState(() => weekStartYmd(todayYmd()));
  const [openSlot, setOpenSlot] = useState<Slot | null>(null);
  const [bookSlot, setBookSlot] = useState<Slot | null>(null);
  const [openBooking, setOpenBooking] = useState<Booking | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYmd(week, i)), [week]);
  const from = Timestamp.fromDate(istDate(week));
  const to = Timestamp.fromDate(istDate(addDaysYmd(week, 7)));
  const slots = useLiveCollection<Slot>(schoolCol(schoolId, 'slots'), [where('start', '>=', from), where('start', '<', to)], week);
  const bookings = useLiveCollection<Booking>(schoolCol(schoolId, 'bookings'), [where('start', '>=', from), where('start', '<', to)], week);

  const mine = slots.data.filter((s) => s.instructorId === instructorId);
  const bookingById = new Map(bookings.data.map((b) => [b.id, b]));
  // Bookings whose slot was deleted/cancelled still show on the calendar.
  const orphanBookings = bookings.data.filter((b) => b.instructorId === instructorId && !mine.some((s) => s.bookingId === b.id) && b.status !== 'cancelled');

  const hours = useMemo(() => {
    const hs = [...mine.map((s) => hourOf(s.start)), ...orphanBookings.map((b) => hourOf(b.start))];
    const lo = Math.min(7, ...hs);
    const hi = Math.max(19, ...hs);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [mine, orphanBookings]);

  const today = todayYmd();
  const counts = { open: mine.filter((s) => s.status === 'open').length, booked: mine.filter((s) => s.status === 'booked').length };
  const liveBooking = openBooking ? (bookingById.get(openBooking.id) ?? openBooking) : null;

  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <IconButton icon={ChevronLeft} label="Previous week" onClick={() => setWeek(addDaysYmd(week, -7))} />
        <IconButton icon={ChevronRight} label="Next week" onClick={() => setWeek(addDaysYmd(week, 7))} />
        <Button variant="ghost" size="sm" onClick={() => setWeek(weekStartYmd(todayYmd()))}>
          Today
        </Button>
        <p className="flex-1 text-sm font-bold text-white">
          {ymdLabel(days[0]!, 'd MMM')} – {ymdLabel(days[6]!, 'd MMM yyyy')}
        </p>
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500/50 bg-emerald-500/20" /> Open {counts.open}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Booked {counts.booked}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-700" /> Blocked
          </span>
        </div>
      </div>

      {slots.loading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="scrollbar-thin -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800">
            <div className="bg-slate-900" />
            {days.map((d) => (
              <div key={d} className={clsx('bg-slate-900 px-2 py-2 text-center', d === today && 'bg-brand/10')}>
                <p className={clsx('text-[11px] font-semibold uppercase', d === today ? 'text-brand' : 'text-slate-500')}>{ymdLabel(d, 'EEE')}</p>
                <p className={clsx('text-sm font-bold', d === today ? 'text-brand' : 'text-white')}>{ymdLabel(d, 'd')}</p>
              </div>
            ))}
            {hours.map((h) => (
              <Row key={h} hour={h}>
                {days.map((d) => {
                  const cell = mine.filter((s) => ymdOf(s.start) === d && hourOf(s.start) === h).sort((a, b) => a.start.toMillis() - b.start.toMillis());
                  const orphans = orphanBookings.filter((b) => ymdOf(b.start) === d && hourOf(b.start) === h);
                  return (
                    <div key={d} className={clsx('min-h-[52px] space-y-1 bg-[#0d1424] p-1', d === today && 'bg-brand/[0.03]')}>
                      {cell.map((s) => {
                        const b = s.bookingId ? bookingById.get(s.bookingId) : undefined;
                        if (s.status === 'booked' && b) {
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setOpenBooking(b)}
                              className={clsx(
                                'block w-full truncate rounded-lg px-2 py-1 text-left text-xs font-semibold',
                                b.status === 'completed' ? 'bg-emerald-500/80 text-slate-950' : b.status === 'no_show' ? 'bg-red-500/70 text-white' : 'bg-brand text-slate-950',
                              )}
                              title={`${b.studentName} · ${BOOKING_LABEL[b.status]}`}
                            >
                              {fmtTime(s.start).replace(':00', '')} {b.studentName}
                            </button>
                          );
                        }
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setOpenSlot(s)}
                            className={clsx(
                              'block w-full truncate rounded-lg px-2 py-1 text-left text-xs transition',
                              s.status === 'open' ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'bg-slate-700/70 text-slate-400 line-through hover:bg-slate-700',
                            )}
                          >
                            {fmtTime(s.start)}
                          </button>
                        );
                      })}
                      {orphans.map((b) => (
                        <button key={b.id} type="button" onClick={() => setOpenBooking(b)} className="block w-full truncate rounded-lg bg-brand/70 px-2 py-1 text-left text-xs font-semibold text-slate-950">
                          {fmtTime(b.start)} {b.studentName}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </Row>
            ))}
          </div>
        </div>
      )}
      {!slots.loading && mine.length === 0 && (
        <p className="mt-3 text-center text-sm text-slate-500">No slots this week. Set availability, then use “Generate slots”.</p>
      )}

      {openSlot && (
        <SlotModal
          slot={openSlot}
          onClose={() => setOpenSlot(null)}
          onBook={() => {
            setBookSlot(openSlot);
            setOpenSlot(null);
          }}
        />
      )}
      {bookSlot && <BookSlotModal slot={bookSlot} onClose={() => setBookSlot(null)} />}
      {liveBooking && <BookingModal key={liveBooking.id + liveBooking.status} booking={liveBooking} onClose={() => setOpenBooking(null)} />}
    </Card>
  );
}

function Row({ hour, children }: { hour: number; children: ReactNode }) {
  const label = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
  return (
    <>
      <div className="flex items-start justify-end bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-500">{label}</div>
      {children}
    </>
  );
}

// ---------- Page ----------

export default function SchedulePage() {
  const { instructors } = useSchool();
  const [instructorId, setInstructorId] = useState('');
  const [tab, setTab] = useState<'calendar' | 'availability'>('calendar');
  const [generating, setGenerating] = useState(false);
  const current = instructors.find((i) => i.uid === instructorId) ?? instructors[0];

  if (instructors.length === 0) {
    return (
      <>
        <PageHeader title="Schedule" />
        <EmptyState
          icon={Users}
          title="Add an instructor first"
          description="Invite an instructor, or switch on “Also gives lessons” for yourself on the Team page. Then set weekly hours here."
          action={
            <Link to="/team">
              <Button>Go to Team</Button>
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="Instructor hours, bookable slots and lessons."
        actions={
          <>
            <Select value={current!.uid} onChange={(e) => setInstructorId(e.target.value)} aria-label="Instructor" className="w-full min-w-0 sm:w-auto sm:min-w-[180px]">
              {instructors.map((i) => (
                <option key={i.uid} value={i.uid}>
                  {instructorLabel(i)}
                </option>
              ))}
            </Select>
            <Button icon={Sparkles} onClick={() => setGenerating(true)}>
              Generate slots
            </Button>
          </>
        }
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'calendar', label: 'Week', icon: Clock },
          { id: 'availability', label: 'Availability', icon: CalendarCog },
        ]}
      />
      {tab === 'calendar' ? <WeekCalendar key={current!.uid} instructorId={current!.uid} /> : <AvailabilityEditor key={current!.uid} instructorId={current!.uid} />}
      {generating && <GenerateModal instructorId={current!.uid} instructorName={current!.name} onClose={() => setGenerating(false)} />}
    </>
  );
}
