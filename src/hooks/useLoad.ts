import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { friendlyError } from '../utils/errors';

/** Loads data on focus, exposes loading / error / reload. Keeps previous data while refreshing. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const d = await fn();
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, loading, refreshing, error, reload: () => run('refresh'), setData };
}
