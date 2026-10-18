import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const LAST_UPDATED = '18 October 2026';
export const COMPANY = '[Legal entity name, e.g. Steerly Technologies Pvt. Ltd.]';
export const COMPANY_ADDRESS = '[Registered office address, City, State, PIN]';
export const PRIVACY_EMAIL = 'privacy@steerly.app';
export const SUPPORT_EMAIL = 'hello@steerly.app';
export const GRIEVANCE = {
  name: '[Grievance Officer name]',
  email: 'grievance@steerly.app',
  phone: '[+91 XXXXX XXXXX]',
};

const LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/refund', label: 'Refunds' },
  { to: '/delete-account', label: 'Delete account' },
];

export function LegalLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  useDocumentTitle(title, description);
  const { pathname } = useLocation();
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Legal pages" className="flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={pathname === l.to ? 'page' : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                pathname === l.to
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div
          role="note"
          className="mt-8 flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-400/10 p-4 text-sm text-amber-900 dark:text-amber-200"
        >
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <p>
            <strong>Draft — review with a lawyer.</strong> This is a first draft prepared for review and is not legal
            advice. Text in [square brackets] must be completed before publishing.
          </p>
        </div>
        <h1 className="h-display mt-8 text-4xl sm:text-5xl">{title}</h1>
        <p className="muted mt-3 text-sm">Last updated: {LAST_UPDATED}</p>
        <article className="prose-legal mt-6">{children}</article>
      </div>
    </div>
  );
}
