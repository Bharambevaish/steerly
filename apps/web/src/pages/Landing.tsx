import { formatINR, PLANS, TRIAL_DAYS, type PlanId } from '@steerly/shared/lite';
import {
  ArrowRight,
  CalendarCheck,
  ChartColumn,
  Check,
  ChevronDown,
  FileExclamationPoint,
  Gauge,
  IdCard,
  Mail,
  MessageCircle,
  Palette,
  Quote,
  ReceiptIndianRupee,
  Rocket,
  Settings2,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { HeroMockup } from '../components/HeroMockup';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useReveal } from '../hooks/useReveal';
import { CONTACT_EMAIL, SIGNUP_URL } from '../lib/config';

const TRIAL_LABEL = `${TRIAL_DAYS}-day free trial`;

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub?: string }) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="h-display mt-4 text-3xl sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="muted mt-4 text-base sm:text-lg">{sub}</p>}
    </div>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-300/40 via-orange-300/20 to-transparent blur-3xl dark:from-amber-500/20 dark:via-orange-600/10"
        aria-hidden="true"
      />
      <div className="container-x grid items-center gap-12 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
        <div className="text-center lg:text-left">
          <span className="eyebrow animate-fade-up">
            <Sparkles className="h-3.5 w-3.5" /> Built for Indian driving schools
          </span>
          <h1 className="h-display mt-5 animate-fade-up text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl [animation-delay:80ms]">
            Run your driving school on <span className="text-gradient">autopilot.</span>
          </h1>
          <p className="muted mx-auto mt-6 max-w-xl animate-fade-up text-lg sm:text-xl lg:mx-0 [animation-delay:160ms]">
            Leads, slot bookings, instructors, UPI fee collection, GST receipts and LL/DL tests — in one app your
            students and staff will actually use. Ditch the registers and WhatsApp chaos.
          </p>
          <div className="mt-8 flex animate-fade-up flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start [animation-delay:240ms]">
            <a href={SIGNUP_URL} className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
              Start free {TRIAL_DAYS}-day trial <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#contact" className="btn-ghost w-full px-7 py-3.5 text-base sm:w-auto">
              Book a demo
            </a>
          </div>
          <p className="muted mt-4 animate-fade-up text-sm [animation-delay:320ms]">
            No credit card needed · Set up in 10 minutes · Cancel anytime
          </p>
        </div>
        <HeroMockup />
      </div>
    </section>
  );
}

/* ---------------- Problem → solution ---------------- */

const PAINS = [
  'Enquiries lost in call logs and WhatsApp chats',
  'Lesson timings juggled on paper and phone calls',
  'Chasing fee balances, writing receipts by hand',
  'Missed LL/DL test dates and expired vehicle insurance',
];
const GAINS = [
  'Every lead captured, tagged and followed up on time',
  'Students book open slots themselves from the app',
  'UPI/Razorpay links with automatic GST receipts',
  'Reminders before tests, renewals and every lesson',
];

function ProblemSolution() {
  return (
    <section className="container-x py-20 sm:py-28">
      <SectionHeading
        eyebrow="Why Steerly"
        title={
          <>
            From register books to <span className="text-gradient">real-time.</span>
          </>
        }
        sub="Most driving schools still run on notebooks, missed calls and memory. That's fine at 20 students. It breaks at 100."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2">
        <div className="reveal glass p-7 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Today</p>
          <ul className="mt-5 space-y-4">
            {PAINS.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="muted">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-amber-900/20 sm:p-8 dark:bg-gradient-to-br dark:from-amber-500/15 dark:to-orange-600/5 dark:ring-1 dark:ring-amber-400/20">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/30 blur-3xl" aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">With Steerly</p>
          <ul className="relative mt-5 space-y-4">
            {GAINS.map((g) => (
              <li key={g} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-slate-950">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-slate-200">{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Users, title: 'Leads CRM', body: 'Website, app, walk-in and phone enquiries in one pipeline with follow-up dates and one-tap convert to student.' },
  { icon: CalendarCheck, title: 'Online slot booking', body: 'Publish instructor availability; students book, reschedule or cancel within your rules.' },
  { icon: Smartphone, title: 'Instructor app', body: "Today's lessons, attendance and student notes on the instructor's phone — no more calling the office." },
  { icon: Gauge, title: 'Skill progress tracking', body: 'Rate clutch control, parking, highway driving and more after every lesson. Students see their progress.' },
  { icon: ReceiptIndianRupee, title: 'UPI & Razorpay fees', body: 'Send payment links, record cash/UPI, and issue numbered GST-ready PDF receipts automatically.' },
  { icon: MessageCircle, title: 'WhatsApp & push reminders', body: 'Automatic reminders for lessons, pending fees and test dates. Fewer no-shows, zero awkward calls.' },
  { icon: IdCard, title: 'LL / DL test tracking', body: "Track learner's licence and driving test status, application numbers and test dates for every student." },
  { icon: FileExclamationPoint, title: 'Vehicle document alerts', body: 'Insurance, PUC, fitness and permit expiry alerts before your cars get stopped on the road.' },
  { icon: ChartColumn, title: 'Reports', body: 'Revenue, collections, enquiry conversion and instructor utilisation at a glance. Export anytime.' },
  { icon: Palette, title: 'White-label app', body: 'Your logo, your colours, your name on the Play Store. Students see your brand, not ours.' },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-x">
        <SectionHeading
          eyebrow="Features"
          title="Everything a driving school needs. Nothing it doesn't."
          sub="One login for owners, office staff and instructors — plus an app for your students."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="reveal glass group p-6 transition duration-300 hover:-translate-y-1 hover:border-amber-500/40"
              style={{ transitionDelay: `${(i % 5) * 50}ms` }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 transition group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="muted mt-2 text-sm leading-6">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Rocket, title: 'Sign up in minutes', body: 'Create your school, add courses and fees. Your public enquiry page goes live instantly.' },
  { icon: UserPlus, title: 'Invite your team', body: 'Add staff and instructors by phone number. They log in with OTP — no passwords to forget.' },
  { icon: Settings2, title: 'Let it run', body: 'Students book, pay and track progress in the app. You watch the dashboard and grow.' },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-slate-900/5 bg-white/40 py-20 sm:py-28 dark:border-white/5 dark:bg-white/[0.02]">
      <div className="container-x">
        <SectionHeading eyebrow="How it works" title="Live in an afternoon." />
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div
            className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent md:block"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal relative text-center" style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 text-amber-300 shadow-xl dark:bg-amber-400 dark:text-slate-950">
                <s.icon className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-xs font-bold text-slate-950 ring-4 ring-[#FFFBF5] dark:bg-white dark:ring-slate-950">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
              <p className="muted mx-auto mt-2 max-w-xs text-sm leading-6">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

const PLAN_BLURB: Record<PlanId, string> = {
  starter: 'For new and single-car schools getting organised.',
  pro: 'For growing schools with multiple instructors and cars.',
  whitelabel: 'For established brands that want their own app.',
};

const PLAN_FEATURES = [
  'Leads CRM & public enquiry page',
  'Online slot booking',
  'Instructor & student app',
  'Razorpay/UPI fees + GST receipts',
  'Reminders, LL/DL & vehicle alerts',
  'Reports & exports',
];

function Pricing() {
  const entries = Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][];
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-x">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing. Serious ROI."
          sub={`Every plan starts with a ${TRIAL_LABEL}. One extra enrolment a month usually pays for Steerly.`}
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {entries.map(([id, plan]) => {
            const featured = id === 'pro';
            return (
              <article
                key={id}
                className={`reveal relative flex flex-col rounded-3xl p-7 sm:p-8 ${
                  featured
                    ? 'bg-slate-950 text-white shadow-2xl shadow-amber-900/25 ring-2 ring-amber-400 dark:bg-slate-900'
                    : 'glass'
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-1 text-sm ${featured ? 'text-slate-300' : 'muted'}`}>{PLAN_BLURB[id]}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="h-display text-4xl sm:text-5xl">{formatINR(plan.priceMonthly)}</span>
                  <span className={featured ? 'text-slate-300' : 'muted'}>/month</span>
                </p>
                <p className={`mt-1 text-xs ${featured ? 'text-slate-400' : 'muted'}`}>+ GST · billed monthly</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  <li className="flex gap-2.5 font-semibold">
                    <Check className="h-5 w-5 shrink-0 text-amber-500" /> Up to {plan.maxStudents.toLocaleString('en-IN')} active students
                  </li>
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="h-5 w-5 shrink-0 text-amber-500" /> {f}
                    </li>
                  ))}
                  <li className={`flex gap-2.5 ${plan.whiteLabel ? 'font-semibold' : featured ? 'text-slate-400' : 'muted'}`}>
                    {plan.whiteLabel ? (
                      <Check className="h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <X className="h-5 w-5 shrink-0 opacity-50" />
                    )}
                    {plan.whiteLabel ? 'Your own branded Play Store app' : 'Steerly-branded app'}
                  </li>
                </ul>
                <a href={SIGNUP_URL} className={`mt-8 w-full ${featured ? 'btn-primary' : 'btn-ghost'}`}>
                  Start {TRIAL_LABEL}
                </a>
              </article>
            );
          })}
        </div>
        <p className="muted mt-8 text-center text-sm">
          Prices in INR, exclusive of 18% GST. Need more students or branches?{' '}
          <a href="#contact" className="font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300">
            Talk to us
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* ---------------- Testimonial (sample) ---------------- */

function Testimonial() {
  return (
    <section className="container-x pb-20 sm:pb-28">
      <figure className="reveal glass relative mx-auto max-w-3xl overflow-hidden p-8 text-center sm:p-12">
        <span className="absolute right-4 top-4 rounded-full border border-slate-900/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/15 dark:text-slate-400">
          Sample testimonial
        </span>
        <Quote className="mx-auto h-10 w-10 text-amber-500" />
        <blockquote className="h-display mt-6 text-2xl leading-snug sm:text-3xl">
          “We stopped losing enquiries the first week. Students book their own slots and fees come in on UPI — my
          office phone finally stopped ringing all day.”
        </blockquote>
        <figcaption className="muted mt-6 text-sm">
          <span className="font-semibold text-slate-900 dark:text-white">Owner, pilot driving school</span> · Pilot
          programme, Maharashtra
        </figcaption>
        <p className="muted mt-4 text-xs">Illustrative quote — real customer stories coming soon.</p>
      </figure>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

const FAQS = [
  {
    q: `How does the ${TRIAL_LABEL} work?`,
    a: `Sign up and use every feature free for ${TRIAL_DAYS} days — no card required. Pick a plan before the trial ends to keep going; if you don't, your data is kept safe for 90 days in case you come back.`,
  },
  {
    q: 'Do my students need to download an app?',
    a: 'Students can enquire from your public school page without installing anything. Once enrolled, the Android app lets them book slots, pay fees, see receipts and track skill progress. They log in with their phone number and an OTP.',
  },
  {
    q: 'How do fee payments work?',
    a: "Students pay through secure Razorpay payment links (UPI, cards, net banking, wallets). Cash and direct UPI payments can be recorded manually. Every payment gets a numbered PDF receipt with your GSTIN if you're registered.",
  },
  {
    q: 'Can I use my own school name and logo?',
    a: 'Every plan shows your logo and brand colour inside the app and on your public page. The White-label plan goes further and publishes a separate app under your own name on the Google Play Store.',
  },
  {
    q: 'Is my students’ data safe?',
    a: "Data is stored on Google Cloud (Firebase) with strict per-school access rules — staff only see their own school's data. We follow India's Digital Personal Data Protection Act, 2023. See our privacy policy for details.",
  },
  {
    q: 'Do you support multiple branches and instructors?',
    a: 'Yes. Add branches, cars and as many instructors as you need. Plan limits are based on active students only.',
  },
  {
    q: 'Can I import my existing students?',
    a: 'Yes — share your spreadsheet during onboarding and we’ll help you import students, balances and test dates.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 border-t border-slate-900/5 py-20 sm:py-28 dark:border-white/5">
      <div className="container-x">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-900/10 dark:divide-white/10">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="reveal">
                <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-semibold"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    id={`faq-q-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {f.q}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-amber-600 transition-transform duration-300 dark:text-amber-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={`faq-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <p className="muted pb-5 pr-8 leading-7">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact / final CTA ---------------- */

function Contact() {
  const [form, setForm] = useState({ name: '', school: '', phone: '', city: '' });
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // No backend for demo requests yet: open the visitor's mail app with the details prefilled.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const body = `Hi Steerly team,\n\nI'd like a demo.\n\nName: ${form.name}\nSchool: ${form.school}\nPhone: ${form.phone}\nCity: ${form.city}\n`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Demo request — ${form.school || form.name}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="contact" className="scroll-mt-20 px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white sm:px-12 sm:py-16">
        <div className="bg-grid absolute inset-0 opacity-60 [filter:invert(1)] dark:[filter:none]" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-amber-500/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-20 -top-32 h-72 w-72 rounded-full bg-orange-600/30 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="h-display text-4xl leading-tight sm:text-5xl">
              Your school, <span className="text-amber-300">on autopilot</span> by next week.
            </h2>
            <p className="mt-4 max-w-md text-lg text-slate-300">
              Start the {TRIAL_LABEL} yourself, or book a 20-minute walkthrough and we'll set it up with you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={SIGNUP_URL} className="btn-primary px-7 py-3.5 text-base">
                Start free {TRIAL_DAYS}-day trial <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="btn border border-white/20 px-7 py-3.5 text-base text-white hover:bg-white/10"
              >
                <Mail className="h-4 w-4" /> {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <form onSubmit={onSubmit} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:p-7">
            <h3 className="font-display text-xl font-semibold">Book a demo</h3>
            <p className="mt-1 text-sm text-slate-400">We'll call you back within one working day.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['name', 'Your name', 'text', 'name'],
                  ['school', 'School name', 'text', 'organization'],
                  ['phone', 'Mobile number', 'tel', 'tel'],
                  ['city', 'City', 'text', 'address-level2'],
                ] as const
              ).map(([k, label, type, ac]) => (
                <label key={k} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
                  <input
                    required={k !== 'city'}
                    type={type}
                    autoComplete={ac}
                    inputMode={type === 'tel' ? 'tel' : undefined}
                    value={form[k]}
                    onChange={set(k)}
                    className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </label>
              ))}
            </div>
            <button type="submit" className="btn-primary mt-5 w-full">
              Request demo
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  useDocumentTitle(
    null,
    'Steerly is driving school management software for India: leads CRM, online slot booking, instructor app, skill tracking, UPI/Razorpay fees with GST receipts and WhatsApp reminders.',
  );
  useReveal();
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonial />
      <Faq />
      <Contact />
    </>
  );
}
