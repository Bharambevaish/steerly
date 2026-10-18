import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Smartphone } from 'lucide-react';
import { auth } from '../lib/firebase';
import { errorMessage } from '../lib/callables';
import { useAuth } from '../auth/AuthProvider';
import { CenteredCard } from '../auth/guards';
import { Button, FormField, Input, Tabs } from '../components/ui';
import { ErrorBox, InfoBox, PhoneOtpForm } from '../components/PhoneOtpForm';
import { Logo } from '../components/Logo';

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Logo className="h-11 w-11" />
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function EmailForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Check your connection and try again.'));
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email first, then tap "Forgot password".');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // Don't reveal whether the account exists.
    }
    setInfo('If that email has an account, a reset link is on its way.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}
      {info && <InfoBox>{info}</InfoBox>}
      <FormField label="Email">
        <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Password">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>
      <Button type="submit" className="w-full" loading={submitting}>
        Sign in
      </Button>
      <button type="button" onClick={handleReset} className="w-full text-xs text-slate-400 hover:text-white">
        Forgot password?
      </button>
    </form>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [tab, setTab] = useState<'phone' | 'email'>('phone');

  if (!loading && user) return <Navigate to={from} replace />;

  return (
    <CenteredCard>
      <div className="card p-6 sm:p-8">
        <AuthHeader title="Welcome back" subtitle="Sign in to your school dashboard" />
        <Tabs
          className="mb-5"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'phone', label: 'Phone OTP', icon: Smartphone },
            { id: 'email', label: 'Email', icon: Mail },
          ]}
        />
        {tab === 'phone' ? <PhoneOtpForm /> : <EmailForm />}
      </div>
      <p className="mt-5 text-center text-sm text-slate-400">
        New driving school?{' '}
        <Link to="/signup" className="font-semibold text-brand hover:underline">
          Start your free trial
        </Link>
      </p>
    </CenteredCard>
  );
}
