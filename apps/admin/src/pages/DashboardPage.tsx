import { useMemo } from 'react';
import { Link } from 'react-router';
import { Timestamp, where } from 'firebase/firestore';
import { CalendarClock, CalendarDays, GraduationCap, IndianRupee, Percent, Sparkles, TrendingUp, UserPlus, Wallet, type LucideIcon } from 'lucide-react';
import { schoolCol, type Booking } from '@steerly/shared';
import { useLiveCollection, useDashboardStats } from '../lib/hooks';
import { useSchool, useSchoolId } from '../lib/school';
import { addDaysYmd, daysUntil, fmt, fmtTime, formatINR, istDate, monthStart, todayYmd } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { StatCard } from '../components/StatCard';
import { ChartCard, InstructorChart, RevenueChart, SourceChart } from '../components/Charts';
import { Badge, Button, EmptyState, PageHeader, Skeleton } from '../components/ui';

function SubscriptionBanner() {
  const { school } = useSchool();
  const sub = school?.subscription;
  if (!sub || sub.status !== 'trial') return null;
  const left = daysUntil(sub.trialEndsAt);
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/5 to-transparent p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {left == null ? 'Free trial' : left > 0 ? `${left} day${left === 1 ? '' : 's'} left in your free trial` : 'Your free trial has ended'}
          </p>
          <p className="text-xs text-slate-400">{sub.trialEndsAt ? `Trial ends ${fmt(sub.trialEndsAt)}. ` : ''}Pick a plan to keep students booking without interruption.</p>
        </div>
      </div>
      <Link to="/settings#billing">
        <Button size="sm">Choose a plan</Button>
      </Link>
    </div>
  );
}

const STATUS_TONE = { booked: 'blue', completed: 'emerald', cancelled: 'slate', no_show: 'red' } as const;

function TodayLessons() {
  const schoolId = useSchoolId();
  const today = todayYmd();
  const from = Timestamp.fromDate(istDate(today));
  const to = Timestamp.fromDate(istDate(addDaysYmd(today, 1)));
  const { data, loading } = useLiveCollection<Booking>(schoolCol(schoolId, 'bookings'), [where('start', '>=', from), where('start', '<', to)], today);
  const rows = data.filter((b) => b.status !== 'cancelled').sort((a, b) => a.start.toMillis() - b.start.toMillis());

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Today's lessons</h3>
          <p className="text-xs text-slate-500">{fmt(new Date(), 'EEEE, d MMMM')} · live</p>
        </div>
        <Link to="/schedule" className="text-xs font-semibold text-brand hover:underline">
          Open schedule
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No lessons today" description="Booked lessons will show up here as they happen." className="py-8" />
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
              <div className="w-16 shrink-0 text-center">
                <p className="text-sm font-bold text-white">{fmtTime(b.start)}</p>
                <p className="text-[11px] text-slate-500">{fmtTime(b.end)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/students/${b.studentId}`} className="block truncate text-sm font-semibold text-white hover:text-brand">
                  {b.studentName}
                </Link>
                <p className="truncate text-xs text-slate-500">with {b.instructorName}</p>
              </div>
              <Badge tone={STATUS_TONE[b.status]}>{b.status.replace('_', ' ')}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { schoolId, school } = useSchool();
  const { user } = useAuth();
  const from = useMemo(() => monthStart(), []);
  const to = useMemo(() => new Date(), []);
  const { stats, loading, failed } = useDashboardStats(schoolId, from, to);

  const cards: { label: string; value: string; icon: LucideIcon; hint?: string; accent?: boolean }[] = [
    { label: 'New leads', value: String(stats.newEnquiries), icon: UserPlus, hint: 'This month' },
    { label: 'Conversion', value: `${Math.round(stats.conversionRate * 100)}%`, icon: Percent, hint: 'Leads → students' },
    { label: 'Active students', value: String(stats.activeStudents), icon: GraduationCap },
    { label: 'Lessons done', value: String(stats.lessonsCompleted), icon: CalendarClock, hint: stats.noShows ? `${stats.noShows} no-shows` : 'This month' },
    { label: 'Revenue', value: formatINR(stats.revenue), icon: IndianRupee, hint: 'Collected this month', accent: true },
    { label: 'Outstanding', value: formatINR(stats.outstanding), icon: Wallet, hint: 'Due across students' },
  ];

  const firstName = (user?.displayName || '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hey ${firstName}` : 'Dashboard'}
        subtitle={`${school?.name ?? ''} · ${fmt(from, 'MMMM yyyy')}`}
        actions={
          <Link to="/reports">
            <Button variant="secondary" size="sm" icon={TrendingUp}>
              Reports
            </Button>
          </Link>
        }
      />
      <SubscriptionBanner />
      {failed && (
        <p className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          Couldn't load this month's numbers right now — showing zeros. They'll appear once the stats service responds.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} loading={loading} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue" subtitle="Collected per day, this month" loading={loading} empty={!stats.revenueByDay.length}>
            <RevenueChart data={stats.revenueByDay} />
          </ChartCard>
        </div>
        <ChartCard title="Leads by source" subtitle="This month" loading={loading} empty={!stats.enquiriesBySource.length}>
          <SourceChart data={stats.enquiriesBySource} />
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Lessons by instructor" subtitle="Completed this month" loading={loading} empty={!stats.lessonsByInstructor.length}>
          <InstructorChart data={stats.lessonsByInstructor} />
        </ChartCard>
        <TodayLessons />
      </div>
    </>
  );
}
