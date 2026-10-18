// Lightweight connectivity check without extra native deps: ping a 204 endpoint while the app is
// active and feed the result to react-query's onlineManager. (Swap for expo-network later if added.)
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';

const PING_URL = 'https://clients3.google.com/generate_204';

async function ping(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(PING_URL, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let alive = true;
    let failures = 0;
    const check = async () => {
      const ok = await ping();
      if (!alive) return;
      // Require two misses in a row to avoid flashing the banner on one slow request.
      failures = ok ? 0 : failures + 1;
      const next = ok || failures < 2;
      setOnline(next);
      onlineManager.setOnline(next);
    };
    check();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') check();
    }, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      alive = false;
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return online;
}
