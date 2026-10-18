import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Centered dialog on desktop, bottom sheet on mobile. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:rounded-2xl', sizes[size])}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Right-side panel (full width on mobile). */
export function Drawer({ open, onClose, title, description, children, footer }: Omit<ModalProps, 'size'>) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md animate-slide-in flex-col border-l border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | unknown;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, children }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* caller shows the toast */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {danger && <AlertTriangle className="h-5 w-5 text-red-400" />}
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={run} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-slate-300">{message}</p>}
      {children}
    </Modal>
  );
}
