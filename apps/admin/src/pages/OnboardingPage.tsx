import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Building2, PartyPopper, UserRound } from 'lucide-react';
import clsx from 'clsx';
import { createSchoolSchema, TRIAL_DAYS } from '@steerly/shared';
import { call, errorMessage } from '../lib/callables';
import { useAuth } from '../auth/AuthProvider';
import { CenteredCard } from '../auth/guards';
import { Button, FormField, Input, Textarea } from '../components/ui';
import { ErrorBox } from '../components/PhoneOtpForm';
import { Logo } from '../components/Logo';

export default function OnboardingPage() {
  const { user, role, claimSchoolId, refreshClaims, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    ownerName: user?.displayName ?? '',
    name: '',
    city: '',
    phone: user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '',
    address: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState<string | null>(null);

  if (isSuperAdmin) return <Navigate to="/platform" replace />;
  if (role && claimSchoolId && !code) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const next = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.ownerName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    setStep(1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = createSchoolSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.');
      return;
    }
    setBusy(true);
    try {
      const res = await call('createSchool', parsed.data);
      await refreshClaims(); // getIdToken(true) → role=owner, schoolId
      setCode(res.code);
      setStep(2);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the school. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const steps = ['You', 'Your school', 'Done'];

  return (
    <CenteredCard>
      <div className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo className="h-10 w-10" />
          <button type="button" onClick={signOut} className="text-xs text-slate-500 hover:text-white">
            Sign out
          </button>
        </div>
        <div className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col gap-1.5">
              <div className={clsx('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-slate-800')} />
              <span className={clsx('text-xs font-semibold', i <= step ? 'text-brand' : 'text-slate-600')}>{s}</span>
            </div>
          ))}
        </div>

        {error && <div className="mb-4"><ErrorBox>{error}</ErrorBox></div>}

        {step === 0 && (
          <form onSubmit={next} className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <UserRound className="h-5 w-5 text-brand" />
              <h1 className="text-lg font-bold">Welcome! What should we call you?</h1>
            </div>
            <FormField label="Owner name">
              <Input autoFocus autoComplete="name" value={form.ownerName} onChange={set('ownerName')} placeholder="Prince Kumar" />
            </FormField>
            <Button type="submit" className="w-full">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-brand" />
              <h1 className="text-lg font-bold">Tell us about your school</h1>
            </div>
            <FormField label="School name">
              <Input autoFocus value={form.name} onChange={set('name')} placeholder="Prince Driving School" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City">
                <Input value={form.city} onChange={set('city')} placeholder="Pune" />
              </FormField>
              <FormField label="School phone">
                <Input type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
              </FormField>
            </div>
            <FormField label="Address" hint="Optional — shown on receipts and your public page">
              <Textarea value={form.address} onChange={set('address')} rows={2} />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(0)} icon={ArrowLeft}>
                Back
              </Button>
              <Button type="submit" className="flex-1" loading={busy}>
                Create school
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
              <PartyPopper className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-white">{form.name} is live!</h1>
            <p className="text-sm text-slate-400">Your {TRIAL_DAYS}-day free trial has started. Students join your school in the app with this code:</p>
            <p className="rounded-2xl border border-brand/30 bg-brand/10 py-3 font-mono text-3xl font-black tracking-[0.3em] text-brand">{code}</p>
            <p className="text-xs text-slate-500">Next: add your courses, instructors and vehicles.</p>
            <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CenteredCard>
  );
}
