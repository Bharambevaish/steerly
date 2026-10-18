import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { CONTACT_EMAIL, SIGNUP_URL } from '../lib/config';
import { Logo } from './Logo';

const NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-slate-900/5 bg-[#FFFBF5]/80 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/75'
          : 'border-b border-transparent'
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between">
        <Link to="/" aria-label="Steerly home" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/#contact" className="btn-ghost !py-2">
            Book a demo
          </Link>
          <a href={SIGNUP_URL} className="btn-primary !py-2">
            Start free trial
          </a>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container-x animate-fade-up pb-5 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link to={n.href} className="block rounded-xl px-3 py-3 font-medium hover:bg-slate-900/5 dark:hover:bg-white/5">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to="/#contact" className="btn-ghost">
              Book a demo
            </Link>
            <a href={SIGNUP_URL} className="btn-primary">
              Start free trial
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-900/5 dark:border-white/5">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="muted mt-3 max-w-sm text-sm">
            Run your driving school on autopilot. Leads, bookings, instructors, fees and RTO tests — one app, made in
            India.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-semibold text-amber-800 hover:underline dark:text-amber-300">
            {CONTACT_EMAIL}
          </a>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="muted mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/#features">Features</Link></li>
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/#pricing">Pricing</Link></li>
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/#faq">FAQ</Link></li>
            <li><a className="hover:text-slate-900 dark:hover:text-white" href={SIGNUP_URL}>Start free trial</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Legal</h2>
          <ul className="muted mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/terms">Terms of service</Link></li>
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/refund">Refund & cancellation</Link></li>
            <li><Link className="hover:text-slate-900 dark:hover:text-white" to="/delete-account">Delete your account</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-x muted flex flex-col gap-2 border-t border-slate-900/5 py-6 text-xs sm:flex-row sm:justify-between dark:border-white/5">
        <p>© {new Date().getFullYear()} Steerly. All rights reserved.</p>
        <p>Payments are processed securely by Razorpay.</p>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-amber-400 px-4 py-2 font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
