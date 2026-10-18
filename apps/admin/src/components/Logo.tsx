import clsx from 'clsx';

/** Steerly mark: an "S" inside a steering wheel. Uses the brand colour. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('text-brand', className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-current opacity-15" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M38.5 24.5c-1.6-2-4-3-6.7-3-3.8 0-6.6 2.1-6.6 5.2 0 6.6 13.6 3.6 13.6 10.5 0 3.3-3 5.5-7 5.5-3 0-5.6-1.2-7.3-3.4" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}
