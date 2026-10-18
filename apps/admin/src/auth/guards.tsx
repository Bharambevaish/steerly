import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Smartphone } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useSchool } from '../lib/school';
import { Button, Spinner } from '../components/ui';
import { Logo } from '../components/Logo';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120]">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1120] bg-[radial-gradient(ellipse_at_top,rgb(var(--brand)/0.12),transparent_60%)] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function UseMobileApp() {
  const { role, signOut, user } = useAuth();
  return (
    <CenteredCard>
      <div className="card space-y-4 p-6 text-center">
        <Logo className="mx-auto h-12 w-12" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Smartphone className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Use the Steerly mobile app</h1>
        <p className="text-sm text-slate-400">
          {user?.phoneNumber || user?.email} is signed in as {role === 'instructor' ? 'an instructor' : 'a student'}. Lessons, progress and payments live in the
          mobile app — the dashboard is for school owners and office staff.
        </p>
        <Button variant="secondary" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </CenteredCard>
  );
}

/** Signed in, any role. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** The school dashboard: admin role + an effective school. */
export function RequireSchool({ children }: { children: ReactNode }) {
  const { user, loading, role, claimSchoolId, isSuperAdmin, signOut } = useAuth();
  const school = useSchool();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role === 'student' || role === 'instructor') return <UseMobileApp />;
  if (isSuperAdmin) {
    if (!school.schoolId) return <Navigate to="/platform" replace />;
  } else if (!role || !claimSchoolId) {
    return <Navigate to="/onboarding" replace />;
  }
  if (school.loading) return <Splash />;
  if (school.notFound) {
    return (
      <CenteredCard>
        <div className="card space-y-3 p-6 text-center">
          <h1 className="text-lg font-bold text-white">School not found</h1>
          <p className="text-sm text-slate-400">The school linked to this account no longer exists. Contact Steerly support.</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => (isSuperAdmin ? school.selectSchool(null) : signOut())}
          >
            {isSuperAdmin ? 'Pick another school' : 'Sign out'}
          </Button>
        </div>
      </CenteredCard>
    );
  }
  return <>{children}</>;
}

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
