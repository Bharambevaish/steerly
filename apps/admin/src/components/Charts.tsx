import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DashboardStats } from '@steerly/shared';
import { formatINR, SOURCE_LABELS } from '../lib/format';
import { Skeleton } from './ui';

// Single-series charts in the school brand colour; recessive grid/axes; hover tooltips.
const BRAND = 'rgb(var(--brand))';
const AXIS = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = '#1e293b';

function TooltipBox({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, loading, empty, action }: { title: string; subtitle?: string; children: ReactNode; loading?: boolean; empty?: boolean; action?: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <Skeleton className="h-56" />
      ) : empty ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">No data for this period yet</div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}

export function RevenueChart({ data }: { data: DashboardStats['revenueByDay'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => safeDay(d, 'd MMM')} minTickGap={24} />
        <YAxis {...AXIS} width={56} tickFormatter={(v: number) => compactINR(v)} />
        <Tooltip
          cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? <TooltipBox label={safeDay(String(label), 'EEE d MMM')} value={formatINR(Number(payload[0]!.value))} /> : null
          }
        />
        <Area type="monotone" dataKey="amount" stroke={BRAND} strokeWidth={2} fill="url(#revFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#0f172a' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InstructorChart({ data }: { data: DashboardStats['lessonsByInstructor'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...AXIS} interval={0} tickFormatter={(n: string) => (n.length > 10 ? `${n.slice(0, 9)}…` : n)} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]!.payload as DashboardStats['lessonsByInstructor'][number];
            return (
              <TooltipBox
                label={row.name}
                value={
                  <>
                    {row.completed} lessons{row.avgRating != null && <span className="ml-1 font-normal text-slate-400">· ★ {row.avgRating.toFixed(1)}</span>}
                  </>
                }
              />
            );
          }}
        />
        <Bar dataKey="completed" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SourceChart({ data }: { data: DashboardStats['enquiriesBySource'] }) {
  const rows = data.map((d) => ({ ...d, label: SOURCE_LABELS[d.source] ?? d.source }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" {...AXIS} allowDecimals={false} />
        <YAxis type="category" dataKey="label" {...AXIS} width={70} />
        <Tooltip
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
          content={({ active, payload }) => (active && payload?.length ? <TooltipBox label={String(payload[0]!.payload.label)} value={`${payload[0]!.value} leads`} /> : null)}
        />
        <Bar dataKey="count" fill={BRAND} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function safeDay(d: string, pattern: string): string {
  try {
    return format(parseISO(d), pattern);
  } catch {
    return d;
  }
}

function compactINR(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(0)}k`;
  return `₹${r}`;
}
