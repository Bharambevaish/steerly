import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { CheckCircle2, Mail, Smartphone } from 'lucide-react';
import { TRIAL_DAYS } from '@steerly/shared';
import { auth } from '../lib/firebase';
import { errorMessage } from '../lib/callables';
import { useAuth } from '../auth/AuthProvider';
import { CenteredCard } from '../auth/guards';
import { Button, FormField, Input, Tabs } from '../components/ui';
import { ErrorBox, PhoneOtpForm } from '../components/PhoneOtpForm';
import { AuthHeader } from './LoginPage';

function EmailSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}
      <FormField label="Your name">
        <Input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Work email">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Password" hint="At least 8 characters">
        <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>
      <Button type="submit" className="w-full" loading={busy}>
        Create account
      </Button>
    </form>
  );
}

export default function SignupPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  if (!loading && user) return <Navigate to="/onboarding" replace />;

  return (
    <CenteredCard>
      <div className="card p-6 sm:p-8">
        <AuthHeader title="Start with Steerly" subtitle={`${TRIAL_DAYS}-day free trial · no card needed`} />
        <ul className="mb-5 space-y-1.5 text-sm text-slate-300">
          {['Leads, students & fees in one place', 'Lesson booking app for your students', 'Receipts, reminders & reports'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-brand" /> {t}
            </li>
          ))}
        </ul>
        <Tabs
          className="mb-5"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'phone', label: 'Phone OTP', icon: Smartphone },
            { id: 'email', label: 'Email', icon: Mail },
          ]}
        />
        {tab === 'phone' ? <PhoneOtpForm submitLabel="Continue" /> : <EmailSignup />}
      </div>
      <p className="mt-5 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </CenteredCard>
  );
}
