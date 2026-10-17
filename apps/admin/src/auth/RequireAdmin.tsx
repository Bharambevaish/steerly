import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-slate-800/70 border border-slate-700 rounded-2xl p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-white">No admin access</h2>
          <p className="text-sm text-slate-400">
            {user.email} is signed in but doesn't have an admin role yet. Ask the school owner to
            give you access, then sign in again.
          </p>
          <button
            onClick={signOut}
            className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
