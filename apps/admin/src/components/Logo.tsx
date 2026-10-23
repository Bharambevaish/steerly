import { useId } from 'react';
import clsx from 'clsx';

// Paths mirror scripts/brand/src/mark.svg (gradient) and mark-mono.svg (currentColor), 64×64 viewBox.
const RIM = 'M48.11 21.93A19 19 0 0 0 13 32H26M38 32H51A19 19 0 0 1 15.89 42.07';
const HUB = 'M32 26.25a5.75 5.75 0 1 1 0 11.5a5.75 5.75 0 1 1 0-11.5zm0 3.5a2.25 2.25 0 1 0 0 4.5a2.25 2.25 0 1 0 0-4.5z';

/**
 * Steerly mark: a steering wheel whose split rim reads as an "S".
 * Default is the amber→orange gradient used by the app icon and favicons; `mono` inherits `currentColor`.
 */
export function Logo({ className, mono }: { className?: string; mono?: boolean }) {
  const gradientId = `steerly-g-${useId().replace(/:/g, '')}`;
  const paint = mono ? 'currentColor' : `url(#${gradientId})`;
  return (
    <svg viewBox="0 0 64 64" fill="none" className={clsx(mono && 'text-brand', className)} aria-hidden="true">
      {!mono && (
        <defs>
          <linearGradient id={gradientId} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F97316" />
          </linearGradient>
        </defs>
      )}
      <path d={RIM} stroke={paint} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={HUB} fill={paint} fillRule="evenodd" />
    </svg>
  );
}
