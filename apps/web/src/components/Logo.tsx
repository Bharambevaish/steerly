import { useId } from 'react';

/** Steerly mark: a steering wheel whose spokes form a stylised "S"-like sweep. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <circle cx="32" cy="32" r="19" stroke={`url(#${id})`} strokeWidth="6" />
      <path d="M15 34c6-4 11-5 17-5s11 1 17 5" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <path d="M32 29v20" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#0F172A" stroke={`url(#${id})`} strokeWidth="3" />
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
