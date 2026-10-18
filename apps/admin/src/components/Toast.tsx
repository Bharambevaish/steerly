import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { errorMessage } from '../lib/callables';

type Kind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msgOrErr: unknown, fallback?: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++;
      setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      info: (m) => push('info', m),
      error: (e, fallback) => {
        if (typeof e !== 'string') console.error(e);
        push('error', typeof e === 'string' ? e : errorMessage(e, fallback));
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
          {items.map((t) => {
            const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info;
            return (
              <div
                key={t.id}
                role="status"
                className={clsx(
                  'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border bg-slate-900/95 px-4 py-3 text-sm shadow-2xl backdrop-blur',
                  t.kind === 'success' && 'border-emerald-500/40',
                  t.kind === 'error' && 'border-red-500/40',
                  t.kind === 'info' && 'border-slate-700',
                )}
              >
                <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', t.kind === 'success' ? 'text-emerald-400' : t.kind === 'error' ? 'text-red-400' : 'text-brand')} />
                <p className="flex-1 text-slate-100">{t.message}</p>
                <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
