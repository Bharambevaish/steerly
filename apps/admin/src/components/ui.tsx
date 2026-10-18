import { forwardRef, type HTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import { Loader2, type LucideIcon } from 'lucide-react';

// ---------- Button ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-slate-950 hover:brightness-110 shadow-sm shadow-brand/20',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700',
  ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx('inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white', className)}
      {...rest}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// ---------- Form controls ----------

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx('input', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx('input min-h-[84px] resize-y', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={clsx('input appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: SELECT_ARROW }} {...rest}>
      {children}
    </select>
  );
});

const SELECT_ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function FormField({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block space-y-1.5', className)}>
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-300">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx('inline-flex items-center gap-2 text-sm disabled:opacity-50', !label && 'shrink-0')}
    >
      <span className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-slate-700')}>
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label && <span className="text-slate-300">{label}</span>}
    </button>
  );
}

// ---------- Display ----------

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card', className)} {...rest}>
      {children}
    </div>
  );
}

export type Tone = 'slate' | 'brand' | 'amber' | 'blue' | 'emerald' | 'red' | 'violet';
const tones: Record<Tone, string> = {
  slate: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
  brand: 'bg-brand/15 text-brand border-brand/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export function Badge({ tone = 'slate', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-xl bg-slate-800/80', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-6 w-6 animate-spin text-brand', className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-12 text-center', className)}>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={clsx('scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.id)}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
              active ? 'bg-brand/15 text-brand ring-1 ring-brand/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
            {t.count !== undefined && <span className={clsx('rounded-md px-1.5 text-xs', active ? 'bg-brand/20' : 'bg-slate-800')}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) return <img src={src} alt="" className={clsx('h-9 w-9 rounded-xl object-cover', className)} />;
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-sm font-bold text-brand', className)}>{letters || '?'}</div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}
