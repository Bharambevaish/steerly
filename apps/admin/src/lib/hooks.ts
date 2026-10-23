import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '@steerly/shared';
import { db } from './firebase';
import { call } from './callables';

export interface LiveResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Live (onSnapshot) query. `path` null = disabled. `key` must change whenever `constraints` change
 * (constraints are rebuilt every render, so they're read from a ref).
 *
 * State is tagged with the subscription it belongs to, so a new path/key reads as "loading" during
 * render instead of resetting state synchronously inside the effect.
 */
export function useLiveCollection<T extends { id: string }>(
  path: string | null,
  constraints: QueryConstraint[] = [],
  key = '',
): LiveResult<T> {
  const sub = path ? `${path}|${key}` : null;
  const [state, setState] = useState<LiveResult<T> & { sub: string | null }>({ sub: null, data: [], loading: false, error: null });
  const constraintsRef = useRef(constraints);
  // Keep the latest constraints for the subscription effect below (runs first in the same commit).
  useEffect(() => {
    constraintsRef.current = constraints;
  });

  useEffect(() => {
    if (!path || !sub) return;
    const q = query(collection(db, path), ...constraintsRef.current);
    return onSnapshot(
      q,
      (snap) =>
        setState({
          sub,
          data: snap.docs.map((d) => ({ ...(d.data() as DocumentData), id: d.id }) as T),
          loading: false,
          error: null,
        }),
      (error) => {
        console.error(`Live query ${path} failed`, error);
        setState({ sub, data: [], loading: false, error });
      },
    );
  }, [path, sub]);

  if (!sub) return EMPTY_LIVE as LiveResult<T>;
  if (state.sub !== sub) return LOADING_LIVE as LiveResult<T>;
  return state;
}

const EMPTY_LIVE: LiveResult<never> = { data: [], loading: false, error: null };
const LOADING_LIVE: LiveResult<never> = { data: [], loading: true, error: null };

export interface LiveDocResult<T> {
  data: T | null;
  loading: boolean;
  exists: boolean;
  error: Error | null;
}

const EMPTY_DOC: LiveDocResult<never> = { data: null, loading: false, exists: false, error: null };
const LOADING_DOC: LiveDocResult<never> = { data: null, loading: true, exists: false, error: null };

export function useLiveDoc<T extends { id: string }>(path: string | null): LiveDocResult<T> {
  const [state, setState] = useState<LiveDocResult<T> & { path: string | null }>({ path: null, ...EMPTY_DOC });
  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      (snap) =>
        setState({
          path,
          data: snap.exists() ? ({ ...(snap.data() as DocumentData), id: snap.id } as T) : null,
          exists: snap.exists(),
          loading: false,
          error: null,
        }),
      (error) => {
        console.error(`Live doc ${path} failed`, error);
        setState({ path, data: null, exists: false, loading: false, error });
      },
    );
  }, [path]);
  if (!path) return EMPTY_DOC as LiveDocResult<T>;
  if (state.path !== path) return LOADING_DOC as LiveDocResult<T>;
  return state;
}

export const EMPTY_STATS: DashboardStats = {
  newEnquiries: 0,
  conversionRate: 0,
  activeStudents: 0,
  lessonsCompleted: 0,
  noShows: 0,
  revenue: 0,
  outstanding: 0,
  revenueByDay: [],
  lessonsByInstructor: [],
  enquiriesBySource: [],
};

/** getDashboardStats via react-query. Falls back to zeros (with `failed`) if the call errors. */
export function useDashboardStats(schoolId: string | null, from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const q = useQuery({
    queryKey: ['dashboardStats', schoolId, fromIso, toIso],
    enabled: !!schoolId,
    staleTime: 60_000,
    retry: 1,
    queryFn: () => call('getDashboardStats', { schoolId: schoolId!, from: fromIso, to: toIso }),
  });
  return { stats: q.data ?? EMPTY_STATS, loading: q.isLoading, failed: q.isError, error: q.error, refetch: q.refetch };
}
