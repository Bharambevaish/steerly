import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, LogIn, LogOut, Shield } from 'lucide-react';
import { COLLECTIONS, PLANS, type School, type SchoolStatus } from '@steerly/shared';
import { call } from '../lib/callables';
import { useLiveCollection } from '../lib/hooks';
import { useSchool } from '../lib/school';
import { daysUntil, fmt } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { Avatar, Badge, Button, PageHeader, SearchInput, Select, Tabs, type Tone } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { StatCard } from '../components/StatCard';
import { useToast } from '../components/Toast';
import { Logo } from '../components/Logo';

const STATUSES: SchoolStatus[] = ['trial', 'active', 'past_due', 'suspended'];
const TONE: Record<SchoolStatus, Tone> = { trial: 'brand', active: 'emerald', past_due: 'amber', suspended: 'red' };

export default function PlatformPage() {
  const { signOut, user } = useAuth();
  const { selectSchool, schoolId: selected } = useSchool();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading } = useLiveCollection<School>(COLLECTIONS.schools);
  const [tab, setTab] = useState<'all' | SchoolStatus>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((s) => (tab === 'all' || s.subscription?.status === tab) && (!q || s.name.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q)))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }, [data, tab, search]);

  const setStatus = async (s: School, status: SchoolStatus) => {
    setBusy(s.id);
    try {
      await call('setSchoolStatus', { schoolId: s.id, status });
      toast.success(`${s.name} → ${status}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  const openAs = (s: School) => {
    selectSchool(s.id);
    navigate('/');
  };

  const mrr = data.filter((s) => s.subscription?.status === 'active').reduce((sum, s) => sum + (PLANS[s.subscription.plan]?.priceMonthly ?? 0), 0);

  const columns: Column<School>[] = [
    {
      key: 'name',
      header: 'School',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} src={s.logoUrl} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{s.name}</p>
            <p className="text-xs text-slate-500">
              {s.city} · <span className="font-mono">{s.code}</span>
            </p>
          </div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', cell: (s) => PLANS[s.subscription?.plan]?.name ?? s.subscription?.plan ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={s.subscription?.status ?? 'trial'} disabled={busy === s.id} onChange={(e) => setStatus(s, e.target.value as SchoolStatus)} className="w-36 py-1.5 text-xs">
            {STATUSES.map((x) => (
              <option key={x} value={x}>
                {x.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
      ),
    },
    {
      key: 'trial',
      header: 'Trial / renews',
      cell: (s) => {
        const sub = s.subscription;
        if (sub?.status === 'trial') {
          const d = daysUntil(sub.trialEndsAt);
          return <Badge tone={d != null && d < 0 ? 'red' : TONE.trial}>{d == null ? 'Trial' : d < 0 ? `Ended ${fmt(sub.trialEndsAt, 'd MMM')}` : `${d}d left`}</Badge>;
        }
        return sub?.currentPeriodEnd ? fmt(sub.currentPeriodEnd) : '—';
      },
    },
    { key: 'created', header: 'Joined', cell: (s) => fmt(s.createdAt), hideOnMobile: true },
    {
      key: 'open',
      header: '',
      align: 'right',
      cell: (s) => (
        <Button size="sm" variant={selected === s.id ? 'primary' : 'secondary'} icon={LogIn} onClick={(e) => (e.stopPropagation(), openAs(s))}>
          Open as
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b1120]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800/80 bg-[#0b1120]/85 px-4 backdrop-blur sm:px-6">
        <Logo className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Steerly Platform</p>
          <p className="truncate text-xs text-slate-500">{user?.email ?? user?.phoneNumber}</p>
        </div>
        {selected && (
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            Back to school
          </Button>
        )}
        <Button variant="ghost" size="sm" icon={LogOut} onClick={signOut}>
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <PageHeader title="Schools" subtitle="Every tenant on Steerly. Open a school to see its dashboard as super admin." />
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Schools" value={String(data.length)} icon={Building2} loading={loading} />
          <StatCard label="Active" value={String(data.filter((s) => s.subscription?.status === 'active').length)} icon={Shield} loading={loading} />
          <StatCard label="On trial" value={String(data.filter((s) => s.subscription?.status === 'trial').length)} icon={Shield} loading={loading} />
          <StatCard label="MRR" value={`₹${(mrr / 100).toLocaleString('en-IN')}`} icon={Shield} accent loading={loading} />
        </div>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs
            className="flex-1"
            value={tab}
            onChange={setTab}
            tabs={[{ id: 'all' as const, label: 'All', count: data.length }, ...STATUSES.map((s) => ({ id: s, label: s.replace('_', ' '), count: data.filter((x) => x.subscription?.status === s).length }))]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Name, city or code…" className="lg:w-72" />
        </div>
        <DataTable rows={rows} columns={columns} rowKey={(s) => s.id} loading={loading} onRowClick={openAs} empty={{ icon: Building2, title: 'No schools' }} />
      </main>
    </div>
  );
}
