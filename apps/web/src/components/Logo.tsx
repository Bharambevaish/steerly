import { useId } from 'react';

/** Steerly mark: a steering wheel whose split rim and spoke read as an "S". Source: scripts/brand/src/mark.svg */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <path
        d="M48.11 21.93A19 19 0 0 0 13 32H26M38 32H51A19 19 0 0 1 15.89 42.07"
        stroke={`url(#${id})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 26.25a5.75 5.75 0 1 1 0 11.5a5.75 5.75 0 1 1 0-11.5zm0 3.5a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 1 0 0-4.5z"
        fill={`url(#${id})`}
        fillRule="evenodd"
      />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">Steerly</span>
    </span>
  );
}
