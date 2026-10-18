import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from './ui';

export function StatCard({ label, value, hint, icon: Icon, loading, accent }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; loading?: boolean; accent?: boolean }) {
  return (
    <div className={clsx('card relative overflow-hidden p-4 sm:p-5', accent && 'border-brand/30 bg-gradient-to-br from-brand/10 to-transparent')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent ? 'bg-brand/20 text-brand' : 'bg-slate-800 text-slate-300')}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</p>}
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
