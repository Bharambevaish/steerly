import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import clsx from 'clsx';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useSchool } from '../lib/school';
import { NotificationsBell } from './NotificationsBell';
import { Avatar, FullPageSpinner } from './ui';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Run',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/leads', label: 'Leads', icon: UserPlus },
      { to: '/students', label: 'Students', icon: GraduationCap },
      { to: '/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    section: 'Setup',
    items: [
      { to: '/courses', label: 'Courses', icon: BookOpen },
      { to: '/vehicles', label: 'Vehicles', icon: Car },
      { to: '/branches', label: 'Branches', icon: Building2 },
      { to: '/team', label: 'Team', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const COLLAPSE_KEY = 'steerly.sidebar.collapsed';

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { isSuperAdmin } = useAuth();
  const { school } = useSchool();
  return (
    <div className="flex h-full flex-col">
      <div className={clsx('flex h-16 items-center gap-3 border-b border-slate-800/80 px-4', collapsed && 'justify-center px-2')}>
        {school?.logoUrl ? (
          <img src={school.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        ) : (
          <Logo className="h-9 w-9 shrink-0" />
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{school?.name ?? 'Steerly'}</p>
            <p className="truncate text-xs text-slate-500">Powered by Steerly</p>
          </div>
        )}
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 pb-16 pt-4">
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-600">{group.section}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-brand/15 text-brand' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
                    )
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        {isSuperAdmin && (
          <div>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-600">Steerly</p>}
            <NavLink
              to="/platform"
              onClick={onNavigate}
              title={collapsed ? 'Platform' : undefined}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  collapsed && 'justify-center px-0',
                  isActive ? 'bg-violet-500/15 text-violet-300' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
                )
              }
            >
              <Shield className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && 'Platform'}
            </NavLink>
          </div>
        )}
      </nav>
    </div>
  );
}

function UserMenu() {
  const { user, role, signOut, isSuperAdmin } = useAuth();
  const { selectSchool } = useSchool();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = user?.displayName || user?.email || user?.phoneNumber || 'Account';

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-800">
        <Avatar name={label} className="h-8 w-8 text-xs" />
        <span className="hidden max-w-[160px] truncate text-sm font-semibold text-slate-200 sm:block">{label}</span>
        <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 animate-slide-up overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">{label}</p>
            <p className="text-xs capitalize text-slate-500">{role === 'superAdmin' ? 'Super admin' : role}</p>
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                selectSchool(null);
                navigate('/platform');
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Shield className="h-4 w-4" /> Switch school
            </button>
          )}
          <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBanner() {
  const { school } = useSchool();
  const status = school?.subscription?.status;
  if (status !== 'past_due' && status !== 'suspended') return null;
  return (
    <div className={clsx('flex items-center gap-2 px-4 py-2 text-sm sm:px-6', status === 'suspended' ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-200')}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {status === 'suspended'
          ? 'This school is suspended. Students cannot send enquiries or book lessons until billing is fixed.'
          : 'Your Steerly payment is overdue. Update billing to avoid suspension.'}
      </span>
      <NavLink to="/settings#billing" className="shrink-0 font-semibold underline">
        Billing
      </NavLink>
    </div>
  );
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { school, isOwner } = useSchool();
  const { isSuperAdmin } = useAuth();
  const location = useLocation();
  // The drawer remembers the page it was opened on, so any navigation closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const mobileOpen = drawerPath === location.pathname;
  const setMobileOpen = (open: boolean) => setDrawerPath(open ? location.pathname : null);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* Desktop sidebar */}
      <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden border-r border-slate-800/80 bg-slate-950/60 backdrop-blur transition-all lg:block', collapsed ? 'w-20' : 'w-64')}>
        <SidebarContent collapsed={collapsed} />
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={clsx('transition-all', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-800/80 bg-[#0b1120]/85 px-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate text-sm font-bold text-white lg:hidden">{school?.name ?? 'Steerly'}</p>
            {isSuperAdmin && (
              <span className="hidden rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300 sm:inline">
                Viewing as super admin
              </span>
            )}
            {!isOwner && !isSuperAdmin && <span className="hidden text-xs text-slate-500 sm:inline">Staff access</span>}
          </div>
          <NotificationsBell />
          <UserMenu />
        </header>
        <StatusBanner />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Suspense fallback={<FullPageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
