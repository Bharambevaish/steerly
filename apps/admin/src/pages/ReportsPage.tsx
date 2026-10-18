import { useMemo, useState } from 'react';
import { CalendarClock, Download, GraduationCap, IndianRupee, Percent, UserPlus, UserX, Wallet } from 'lucide-react';
import { useDashboardStats } from '../lib/hooks';
import { useSchool } from '../lib/school';
import { addDaysYmd, downloadCsv, formatINR, istDate, SOURCE_LABELS, todayYmd } from '../lib/format';
import { Button, Card, FormField, Input, PageHeader } from '../components/ui';
import { StatCard } from '../components/StatCard';
import { ChartCard, InstructorChart, RevenueChart, SourceChart } from '../components/Charts';

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
];

export default function ReportsPage() {
  const { schoolId, school } = useSchool();
  const [from, setFrom] = useState(addDaysYmd(todayYmd(), -29));
  const [to, setTo] = useState(todayYmd());
  const range = useMemo(() => ({ from: istDate(from), to: istDate(addDaysYmd(to, 1)) }), [from, to]);
  const { stats, loading, failed } = useDashboardStats(schoolId, range.from, range.to);

  const exportCsv = () => {
    const name = (school?.slug ?? 'school') + `_report_${from}_${to}.csv`;
    downloadCsv(name, [
      ['Steerly report', school?.name ?? '', `${from} to ${to}`],
      [],
      ['Metric', 'Value'],
      ['New leads', stats.newEnquiries],
      ['Conversion rate (%)', Math.round(stats.conversionRate * 1000) / 10],
      ['Active students', stats.activeStudents],
      ['Lessons completed', stats.lessonsCompleted],
      ['No-shows', stats.noShows],
      ['Revenue (INR)', stats.revenue / 100],
      ['Outstanding (INR)', stats.outstanding / 100],
      [],
      ['Date', 'Revenue (INR)'],
      ...stats.revenueByDay.map((r) => [r.date, r.amount / 100]),
      [],
      ['Instructor', 'Lessons completed', 'Average rating'],
      ...stats.lessonsByInstructor.map((r) => [r.name, r.completed, r.avgRating ?? '']),
      [],
      ['Lead source', 'Leads'],
      ...stats.enquiriesBySource.map((r) => [SOURCE_LABELS[r.source] ?? r.source, r.count]),
    ]);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Revenue, lead conversion and instructor utilisation."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={loading}>
            Export CSV
          </Button>
        }
      />
      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <FormField label="From">
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </FormField>
        <FormField label="To">
          <Input type="date" value={to} min={from} max={todayYmd()} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </FormField>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant="ghost"
              onClick={() => {
                setTo(todayYmd());
                setFrom(addDaysYmd(todayYmd(), -(p.days - 1)));
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </Card>
      {failed && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">Couldn't load stats for this range. Showing zeros.</p>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(stats.revenue)} icon={IndianRupee} accent loading={loading} />
        <StatCard label="Outstanding" value={formatINR(stats.outstanding)} icon={Wallet} loading={loading} />
        <StatCard label="New leads" value={String(stats.newEnquiries)} icon={UserPlus} loading={loading} />
        <StatCard label="Conversion" value={`${Math.round(stats.conversionRate * 100)}%`} icon={Percent} loading={loading} />
        <StatCard label="Active students" value={String(stats.activeStudents)} icon={GraduationCap} loading={loading} />
        <StatCard label="Lessons done" value={String(stats.lessonsCompleted)} icon={CalendarClock} loading={loading} />
        <StatCard label="No-shows" value={String(stats.noShows)} icon={UserX} loading={loading} />
        <StatCard
          label="Show-up rate"
          value={stats.lessonsCompleted + stats.noShows ? `${Math.round((stats.lessonsCompleted / (stats.lessonsCompleted + stats.noShows)) * 100)}%` : '—'}
          icon={Percent}
          loading={loading}
        />
      </div>
      <div className="mt-6 grid gap-4">
        <ChartCard title="Revenue per day" loading={loading} empty={!stats.revenueByDay.length}>
          <RevenueChart data={stats.revenueByDay} />
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Lessons by instructor" subtitle="Hover for average rating" loading={loading} empty={!stats.lessonsByInstructor.length}>
            <InstructorChart data={stats.lessonsByInstructor} />
          </ChartCard>
          <ChartCard title="Leads by source" loading={loading} empty={!stats.enquiriesBySource.length}>
            <SourceChart data={stats.enquiriesBySource} />
          </ChartCard>
        </div>
        {stats.lessonsByInstructor.length > 0 && (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3 text-right">Lessons</th>
                  <th className="px-4 py-3 text-right">Avg rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats.lessonsByInstructor.map((r) => (
                  <tr key={r.instructorId}>
                    <td className="px-4 py-2.5 text-white">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{r.completed}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{r.avgRating != null ? `★ ${r.avgRating.toFixed(1)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
