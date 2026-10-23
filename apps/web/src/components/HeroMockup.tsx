import { Bell, CalendarClock, Car, CircleCheck, IndianRupee, TrendingUp, Users } from 'lucide-react';

/** Progress ring drawn with SVG strokes; animates in on load. */
function ProgressRing({ value, size = 96 }: { value: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r; // ≈ 264
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r={r} stroke="currentColor" strokeWidth="9" className="text-white/10" fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke="url(#ring-g)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        className="motion-safe:animate-ring"
      />
      <defs>
        <linearGradient id="ring-g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Phone() {
  return (
    <div className="relative mx-auto w-[260px] rounded-[2.6rem] border border-white/10 bg-slate-900 p-2.5 shadow-2xl shadow-slate-950/40 ring-1 ring-slate-900/10 sm:w-[280px]">
      <div className="absolute left-1/2 top-3.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className="overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-slate-800 to-slate-950 px-4 pb-6 pt-10 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Good morning,</p>
            <p className="font-display text-lg font-semibold">Aarav 👋</p>
          </div>
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
          </span>
        </div>

        {/* Next lesson card */}
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-slate-950 shadow-lg shadow-orange-500/30">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
            <span>Next lesson</span>
            <span className="rounded-full bg-slate-950/15 px-2 py-0.5">Tomorrow</span>
          </div>
          <p className="mt-2 font-display text-xl font-bold">7:00 – 8:00 AM</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
            <Car className="h-4 w-4" /> Swift Dzire · MH12 AB 1234
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs font-medium">
            <Users className="h-4 w-4" /> Instructor: Rakesh
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="relative">
            <ProgressRing value={72} size={84} />
            <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold">72%</span>
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white">Skill progress</p>
            <p className="mt-0.5 text-slate-400">13 of 18 lessons</p>
            <ul className="mt-2 space-y-1 text-slate-300">
              <li className="flex items-center gap-1.5">
                <CircleCheck className="h-3.5 w-3.5 text-emerald-400" /> Clutch control
              </li>
              <li className="flex items-center gap-1.5">
                <CircleCheck className="h-3.5 w-3.5 text-emerald-400" /> Hill start
              </li>
              <li className="flex items-center gap-1.5 text-slate-500">
                <span className="h-3.5 w-3.5 rounded-full border border-slate-500" /> Parallel parking
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
          <span className="text-slate-400">LL test</span>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-semibold text-emerald-300">Passed ✓</span>
        </div>
      </div>
    </div>
  );
}

function DashboardCard() {
  const bars = [38, 52, 46, 70, 62, 84, 78];
  return (
    <div className="glass w-[300px] !bg-white/95 p-5 sm:w-[320px] dark:!bg-slate-900/95">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">This month</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <TrendingUp className="h-3.5 w-3.5" /> 24%
        </span>
      </div>
      <p className="mt-2 flex items-center font-display text-3xl font-bold">
        <IndianRupee className="h-6 w-6" strokeWidth={2.5} />
        3,48,500
      </p>
      <p className="muted text-xs">Fees collected · 41 receipts</p>
      <div className="mt-4 flex h-20 items-end gap-2" aria-hidden="true">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-amber-500/70 to-amber-300"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { k: 'New leads', v: '32' },
          { k: 'Lessons', v: '418' },
          { k: 'DL passed', v: '19' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl bg-slate-900/[0.04] p-2 dark:bg-white/5">
            <p className="font-display text-lg font-bold">{s.v}</p>
            <p className="muted text-[10px]">{s.k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-[560px] justify-center py-6 lg:justify-end"
      role="img"
      aria-label="Steerly app preview: a student's next lesson and 72% skill progress, next to an owner dashboard showing monthly fee collection."
    >
      <div className="absolute inset-0 -z-10 m-auto h-72 w-72 rounded-full bg-amber-400/30 blur-3xl dark:bg-amber-500/20" />
      <div className="motion-safe:animate-float lg:mr-28">
        <Phone />
      </div>
      <div className="absolute -bottom-2 left-1/2 hidden -translate-x-[95%] motion-safe:animate-fade-up sm:block lg:left-0 lg:translate-x-0 [animation-delay:300ms]">
        <DashboardCard />
      </div>
      <div className="glass absolute right-0 top-10 hidden !bg-white/95 dark:!bg-slate-900/95 items-center gap-3 px-4 py-3 motion-safe:animate-fade-up sm:flex [animation-delay:500ms]">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="text-xs">
          <p className="font-semibold">Slot booked</p>
          <p className="muted">Sat · 6:00 PM</p>
        </div>
      </div>
    </div>
  );
}
