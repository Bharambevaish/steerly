// Realtime Firestore hooks: react-query owns the cache (loading/error/refetch for pull-to-refresh),
// onSnapshot keeps it live. Docs are returned as Partial-ish models with `id` filled in.
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  getDoc,
  getDocs,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Query,
} from 'firebase/firestore';

export type WithId<T> = T & { id: string };

export function useLiveDoc<T>(key: QueryKey, ref: DocumentReference<DocumentData> | null) {
  const qc = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const hash = JSON.stringify(key);
  const q = useQuery<WithId<T> | null>({
    queryKey: key,
    enabled: !!ref,
    staleTime: Infinity,
    queryFn: async () => {
      const s = await getDoc(ref!);
      return s.exists() ? ({ ...(s.data() as T), id: s.id } as WithId<T>) : null;
    },
  });
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (s) => {
        setError(null);
        qc.setQueryData(key, s.exists() ? { ...(s.data() as T), id: s.id } : null);
      },
      (e) => setError(e),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, !!ref]);
  return { data: q.data ?? null, loading: !!ref && q.isPending, error: error ?? q.error, refetch: q.refetch };
}

export function useLiveQuery<T>(key: QueryKey, query: Query<DocumentData> | null) {
  const qc = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const hash = JSON.stringify(key);
  const q = useQuery<WithId<T>[]>({
    queryKey: key,
    enabled: !!query,
    staleTime: Infinity,
    queryFn: async () => {
      const s = await getDocs(query!);
      return s.docs.map((d) => ({ ...(d.data() as T), id: d.id }) as WithId<T>);
    },
  });
  useEffect(() => {
    if (!query) return;
    return onSnapshot(
      query,
      (s) => {
        setError(null);
        qc.setQueryData(
          key,
          s.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
        );
      },
      (e) => setError(e),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, !!query]);
  const data = useMemo(() => q.data ?? [], [q.data]);
  return { data, loading: !!query && q.isPending, error: error ?? q.error, refetch: q.refetch };
}

/** Re-render every `ms` (for countdowns). */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
