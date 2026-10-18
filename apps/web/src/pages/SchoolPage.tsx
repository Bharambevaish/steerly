import {
  COURSES,
  enquiryInputSchema,
  formatINR,
  PREFERRED_TIMES,
  type VehicleType,
} from '@steerly/shared';
import { CircleCheck, Clock, Download, MapPin, MessageCircle, Phone, Car, Bike, Truck } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { LogoMark } from '../components/Logo';
import { firebaseConfigured } from '../firebase';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PLAY_STORE_URL } from '../lib/config';
import {
  fetchCourses,
  onColor,
  resolveSchool,
  safeHex,
  submitEnquiry,
  tenDigits,
  type PublicCourse,
  type PublicSchool,
} from '../lib/school';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; school: PublicSchool; courses: PublicCourse[] };

const VEHICLE_LABEL: Record<VehicleType, string> = {
  car_manual: 'Car · Manual',
  car_auto: 'Car · Automatic',
  two_wheeler: 'Two-wheeler',
  heavy: 'Heavy vehicle',
};
const VEHICLE_ICON = { car_manual: Car, car_auto: Car, two_wheeler: Bike, heavy: Truck } as const;

function Skeleton() {
  return (
    <div className="container-x animate-pulse py-16" role="status" aria-label="Loading school">
      <div className="h-20 w-20 rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="mt-6 h-10 w-2/3 rounded-xl bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-5 w-1/3 rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-3xl bg-slate-200 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="h-display mt-6 text-3xl">{title}</h1>
      <p className="muted mt-3 max-w-md">{body}</p>
      <Link to="/" className="btn-ghost mt-8">
        Go to Steerly
      </Link>
    </div>
  );
}

type FieldErrors = Partial<Record<'name' | 'phone' | 'courseName' | 'preferredTime' | 'form', string>>;

function EnquiryForm({ school, courses }: { school: PublicSchool; courses: PublicCourse[] }) {
  const options = useMemo(
    () =>
      courses.length
        ? courses.map((c) => ({ id: c.id as string | null, name: c.name }))
        : COURSES.map((name) => ({ id: null, name })),
    [courses],
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [time, setTime] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (honeypot) {
      setDone(true); // silently drop bot submissions
      return;
    }
    const picked = options.find((o) => o.name === course);
    const parsed = enquiryInputSchema.safeParse({
      name,
      phone,
      courseId: picked?.id ?? null,
      courseName: picked?.name ?? '',
      preferredTime: time || undefined,
      source: 'web',
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await submitEnquiry(school.id, parsed.data);
      setDone(true);
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string }).code;
      setErrors({
        form:
          code === 'permission-denied'
            ? `${school.name} isn't accepting online enquiries right now. Please call them directly.`
            : 'Could not send your enquiry. Check your connection and try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="py-6 text-center" role="status" aria-live="polite">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--brand)] text-[var(--on-brand)]">
          <CircleCheck className="h-8 w-8" />
        </span>
        <h3 className="h-display mt-5 text-2xl">Enquiry sent!</h3>
        <p className="muted mx-auto mt-2 max-w-sm">
          Thanks{name ? `, ${name.trim().split(' ')[0]}` : ''}. {school.name} will call you on{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{tenDigits(phone)}</span> shortly.
        </p>
        <button
          type="button"
          className="btn-ghost mt-6"
          onClick={() => {
            setDone(false);
            setName('');
            setPhone('');
            setCourse('');
            setTime('');
          }}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const errId = (k: keyof FieldErrors) => (errors[k] ? `err-${k}` : undefined);
  const fieldCls = 'field focus:!border-[var(--brand)] focus:!ring-[color:var(--brand-ring)]';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="enq-name" className="label">
          Full name
        </label>
        <input
          id="enq-name"
          className={fieldCls}
          autoComplete="name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errId('name')}
          placeholder="e.g. Priya Sharma"
        />
        {errors.name && <p id="err-name" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="enq-phone" className="label">
          Mobile number
        </label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 px-3 text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300">
            +91
          </span>
          <input
            id="enq-phone"
            className={`${fieldCls} rounded-l-none`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            maxLength={14}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errId('phone')}
            placeholder="98765 43210"
          />
        </div>
        {errors.phone && <p id="err-phone" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{errors.phone}</p>}
      </div>
      <div>
        <label htmlFor="enq-course" className="label">
          Course
        </label>
        <select
          id="enq-course"
          className={fieldCls}
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          aria-invalid={!!errors.courseName}
          aria-describedby={errId('courseName')}
        >
          <option value="" disabled>
            Select a course
          </option>
          {options.map((o) => (
            <option key={o.id ?? o.name} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
        {errors.courseName && (
          <p id="err-courseName" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{errors.courseName}</p>
        )}
      </div>
      <fieldset aria-describedby={errId('preferredTime')}>
        <legend className="label">Preferred time</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PREFERRED_TIMES.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand)] ${
                time === t
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]'
                  : 'border-slate-300 hover:border-slate-400 dark:border-white/15 dark:hover:border-white/30'
              }`}
            >
              <input
                type="radio"
                name="preferredTime"
                value={t}
                checked={time === t}
                onChange={() => setTime(t)}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
        {errors.preferredTime && (
          <p id="err-preferredTime" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{errors.preferredTime}</p>
        )}
      </fieldset>
      {/* Honeypot: hidden from people, tempting for bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>
      {errors.form && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="btn w-full bg-[var(--brand)] py-3.5 text-base text-[var(--on-brand)] shadow-lg hover:-translate-y-0.5 hover:brightness-110"
      >
        {busy ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="muted text-center text-xs">
        By submitting you agree to be contacted by {school.name} about driving lessons. See the{' '}
        <Link to="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

function SchoolView({ school, courses }: { school: PublicSchool; courses: PublicCourse[] }) {
  const brand = safeHex(school.brandColor);
  const style = {
    '--brand': brand,
    '--on-brand': onColor(brand),
    '--brand-ring': `${brand}4D`,
  } as CSSProperties;
  const phone10 = tenDigits(school.phone);
  const waText = encodeURIComponent(`Hi ${school.name}, I'd like to know more about your driving courses.`);
  const initials = school.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div style={style} className="min-h-screen">
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.14] dark:opacity-25"
          style={{ background: `radial-gradient(80% 90% at 20% 0%, ${brand}, transparent 70%)` }}
          aria-hidden="true"
        />
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />
        <div className="container-x pb-12 pt-10 sm:pb-16 sm:pt-16">
          <div className="flex animate-fade-up flex-col gap-6 sm:flex-row sm:items-center">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={`${school.name} logo`}
                className="h-20 w-20 rounded-2xl bg-white object-contain p-1.5 shadow-lg ring-1 ring-slate-900/5"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-2xl bg-[var(--brand)] font-display text-3xl font-bold text-[var(--on-brand)] shadow-lg">
                {initials}
              </span>
            )}
            <div>
              <h1 className="h-display text-4xl sm:text-5xl">{school.name}</h1>
              {(school.city || school.address) && (
                <p className="muted mt-2 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" /> {school.address || school.city}
                  {school.address && school.city && !school.address.includes(school.city) ? `, ${school.city}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:120ms]">
            <a href="#enquire" className="btn bg-[var(--brand)] px-6 text-[var(--on-brand)] shadow-lg hover:brightness-110">
              Enquire now
            </a>
            {phone10 && (
              <>
                <a href={`tel:+91${phone10}`} className="btn-ghost">
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a
                  href={`https://wa.me/91${phone10}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </>
            )}
            {PLAY_STORE_URL && (
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <Download className="h-4 w-4" /> Get the app
              </a>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="container-x grid gap-10 pb-20 lg:grid-cols-[1fr_440px]">
        <section aria-labelledby="courses-h">
          <h2 id="courses-h" className="h-display text-2xl sm:text-3xl">
            Courses
          </h2>
          {courses.length === 0 ? (
            <p className="muted mt-4">Course details coming soon — send an enquiry and we'll share fees and timings.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {courses.map((c, i) => {
                const Icon = VEHICLE_ICON[c.vehicleType] ?? Car;
                return (
                  <article
                    key={c.id}
                    className="glass flex animate-fade-up flex-col p-6"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-[var(--on-brand)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      {c.vehicleType && VEHICLE_LABEL[c.vehicleType] && (
                        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-xs font-medium dark:bg-white/10">
                          {VEHICLE_LABEL[c.vehicleType]}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">{c.name}</h3>
                    {c.description && <p className="muted mt-1.5 flex-1 text-sm leading-6">{c.description}</p>}
                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-900/5 pt-4 dark:border-white/10">
                      <p className="muted flex items-center gap-1.5 text-sm">
                        <Clock className="h-4 w-4" />
                        {c.sessions} sessions × {c.sessionMinutes} min
                      </p>
                      <p className="font-display text-xl font-bold">{formatINR(c.price)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="enquire" aria-labelledby="enquire-h" className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
          <div className="glass p-6 sm:p-7">
            <h2 id="enquire-h" className="h-display text-2xl">
              Book a free call
            </h2>
            <p className="muted mt-1 text-sm">Tell us what you're looking for and we'll get back to you.</p>
            <div className="mt-6">
              <EnquiryForm school={school} courses={courses} />
            </div>
          </div>
          {PLAY_STORE_URL && (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass mt-4 flex items-center gap-4 p-5 transition hover:-translate-y-0.5"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Download className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold">Already enrolled? Get the app</span>
                <span className="muted block text-sm">Book slots, pay fees and track your progress.</span>
              </span>
            </a>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-900/5 py-8 dark:border-white/5">
        <div className="container-x muted flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
          <Link to="/" className="inline-flex items-center gap-2 hover:text-slate-900 dark:hover:text-white">
            <LogoMark className="h-5 w-5" /> Powered by Steerly
          </Link>
          <nav aria-label="Legal" className="flex gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/refund" className="hover:underline">Refunds</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function SchoolPage() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    if (!firebaseConfigured) {
      setState({ kind: 'error', message: 'This site is not connected to its database yet.' });
      return;
    }
    (async () => {
      try {
        const school = await resolveSchool(slug);
        if (cancelled) return;
        if (!school) {
          setState({ kind: 'notFound' });
          return;
        }
        let courses: PublicCourse[] = [];
        try {
          courses = await fetchCourses(school.id);
        } catch (err) {
          console.warn('Could not load courses', err);
        }
        if (!cancelled) setState({ kind: 'ready', school, courses });
      } catch (err) {
        console.error(err);
        if (!cancelled) setState({ kind: 'error', message: 'Please check your connection and try again.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const school = state.kind === 'ready' ? state.school : null;
  useDocumentTitle(
    school ? `${school.name}${school.city ? ` — Driving school in ${school.city}` : ''}` : 'Driving school',
    school
      ? `Learn to drive with ${school.name}${school.city ? ` in ${school.city}` : ''}. See courses and fees, and send an enquiry in seconds.`
      : undefined,
  );

  if (state.kind === 'loading') return <Skeleton />;
  if (state.kind === 'notFound')
    return <Message title="School not found" body="This link may be mistyped, or the school has moved. Check the link with your driving school." />;
  if (state.kind === 'error') return <Message title="Something went wrong" body={state.message} />;
  return <SchoolView school={state.school} courses={state.courses} />;
}
