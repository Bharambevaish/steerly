import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth, RequireSchool, RequireSuperAdmin } from './auth/guards';
import { SchoolProvider } from './lib/SchoolProvider';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { FullPageSpinner } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const StudentProfilePage = lazy(() => import('./pages/student/StudentProfilePage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PlatformPage = lazy(() => import('./pages/PlatformPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SchoolProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<FullPageSpinner />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route
                    path="/onboarding"
                    element={
                      <RequireAuth>
                        <OnboardingPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/platform"
                    element={
                      <RequireSuperAdmin>
                        <PlatformPage />
                      </RequireSuperAdmin>
                    }
                  />
                  <Route
                    element={
                      <RequireSchool>
                        <Layout />
                      </RequireSchool>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="leads" element={<LeadsPage />} />
                    <Route path="students" element={<StudentsPage />} />
                    <Route path="students/:studentId" element={<StudentProfilePage />} />
                    <Route path="schedule" element={<SchedulePage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="courses" element={<CoursesPage />} />
                    <Route path="vehicles" element={<VehiclesPage />} />
                    <Route path="branches" element={<BranchesPage />} />
                    <Route path="team" element={<TeamPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </SchoolProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
