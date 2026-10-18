import { useState, type FormEvent, type ReactNode } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { phoneSchema } from '@steerly/shared';
import { auth } from '../lib/firebase';
import { call, errorMessage } from '../lib/callables';
import { Button, FormField, Input } from './ui';

/** requestOtp → 6-digit code → verifyOtp → signInWithCustomToken. */
export function PhoneOtpForm({ submitLabel = 'Sign in' }: { submitLabel?: string }) {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    try {
      const res = await call('requestOtp', { phone: parsed.data });
      setDevCode(res.devCode ?? null);
      setStep('code');
      setCode('');
    } catch (err) {
      setError(errorMessage(err, 'Could not send the code. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const { token } = await call('verifyOtp', { phone, code });
      await signInWithCustomToken(auth, token);
      // AuthProvider picks up the user; the page redirects.
    } catch (err) {
      setError(errorMessage(err, 'That code did not work. Try again.'));
      setBusy(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={send} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}
        <FormField label="Mobile number">
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-slate-300">+91</span>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              maxLength={14}
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-l-none"
            />
          </div>
        </FormField>
        <Button type="submit" className="w-full" loading={busy}>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}
      <p className="text-sm text-slate-400">
        We sent a 6-digit code to <span className="font-semibold text-white">+91 {phone.replace(/\D/g, '').slice(-10)}</span>.
      </p>
      {devCode && (
        <p className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-brand">
          <KeyRound className="h-4 w-4" /> Dev mode code: <span className="font-mono font-bold tracking-widest">{devCode}</span>
        </p>
      )}
      <FormField label="Code">
        <Input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center font-mono text-lg tracking-[0.5em]"
        />
      </FormField>
      <Button type="submit" className="w-full" loading={busy}>
        {submitLabel}
      </Button>
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={() => setStep('phone')} className="inline-flex items-center gap-1 text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Change number
        </button>
        <button type="button" onClick={() => send()} disabled={busy} className="font-semibold text-brand disabled:opacity-50">
          Resend code
        </button>
      </div>
    </form>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{children}</p>;
}

export function InfoBox({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{children}</p>;
}
