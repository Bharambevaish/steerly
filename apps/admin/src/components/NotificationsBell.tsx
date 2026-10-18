import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { doc, limit, orderBy, updateDoc, writeBatch } from 'firebase/firestore';
import clsx from 'clsx';
import { Bell, CheckCheck } from 'lucide-react';
import { inboxCol, type InboxNotification } from '@steerly/shared';
import { db } from '../lib/firebase';
import { useLiveCollection } from '../lib/hooks';
import { timeAgo } from '../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from './Toast';

export function NotificationsBell() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = user ? inboxCol(user.uid) : null;
  const { data } = useLiveCollection<InboxNotification>(path, [orderBy('createdAt', 'desc'), limit(30)], 'latest30');
  const unread = data.filter((n) => !n.read);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = async (n: InboxNotification) => {
    if (!path) return;
    if (!n.read) await updateDoc(doc(db, path, n.id), { read: true }).catch((e) => toast.error(e));
    if (n.link && n.link.startsWith('/')) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAll = async () => {
    if (!path || unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => batch.update(doc(db, path, n.id), { read: true }));
    await batch.commit().catch((e) => toast.error(e));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ''}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-slate-950">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 animate-slide-up overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            <button type="button" onClick={markAll} disabled={!unread.length} className="inline-flex items-center gap-1 text-xs font-semibold text-brand disabled:text-slate-600">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="scrollbar-thin max-h-[60vh] overflow-y-auto">
            {data.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">You're all caught up.</p>
            ) : (
              data.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={clsx('flex w-full gap-3 border-b border-slate-800/60 px-4 py-3 text-left transition hover:bg-slate-800/50', !n.read && 'bg-brand/5')}
                >
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{n.title}</span>
                    <span className="block text-sm text-slate-400">{n.body}</span>
                    <span className="mt-1 block text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
