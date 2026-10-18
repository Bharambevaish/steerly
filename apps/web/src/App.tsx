import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { SiteLayout } from './components/SiteLayout';

const Landing = lazy(() => import('./pages/Landing'));
const SchoolPage = lazy(() => import('./pages/SchoolPage'));
const Paid = lazy(() => import('./pages/Paid'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const Terms = lazy(() => import('./pages/legal/Terms'));
const Refund = lazy(() => import('./pages/legal/Refund'));
const DeleteAccount = lazy(() => import('./pages/legal/DeleteAccount'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait for lazy content to mount before scrolling to an anchor.
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public school pages carry the school's own branding, not the Steerly chrome. */}
          <Route path="/s/:slug" element={<SchoolPage />} />
          <Route element={<SiteLayout />}>
            <Route index element={<Landing />} />
            <Route path="paid" element={<Paid />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="refund" element={<Refund />} />
            <Route path="delete-account" element={<DeleteAccount />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
