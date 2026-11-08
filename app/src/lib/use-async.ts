import { useEffect, useEffectEvent, useState } from 'react';

import { useRefreshGeneration } from './refresh';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

type Settled<T> = { key: string; base: string } & ({ status: 'error' } | { status: 'ready'; data: T });

// Runs `load` whenever `key` changes (null means "not yet"), on reload(), and when the
// screen is pulled down to refresh. A result that belongs to an earlier key counts as still
// loading; on a pull-to-refresh the data already shown stays until the new data arrives.
export function useAsync<T>(key: string | null, load: () => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRefreshGeneration();
  const base = key === null ? null : `${key}#${attempt}`;
  const fullKey = base === null ? null : `${base}@${generation}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    if (fullKey === null || base === null) return;
    let cancelled = false;
    run().then(
      (data) => !cancelled && setSettled({ key: fullKey, base, status: 'ready', data }),
      () =>
        !cancelled &&
        // A failed refresh keeps what is on screen rather than replacing it with an error.
        setSettled((prev) =>
          prev && prev.base === base && prev.status === 'ready' ? prev : { key: fullKey, base, status: 'error' },
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [fullKey, base]);

  const current = settled !== null && settled.key === fullKey;
  const refreshing = settled !== null && !current && settled.base === base && settled.status === 'ready';
  const state: AsyncState<T> = current || refreshing ? settled! : { status: 'loading' };
  return { state, reload: () => setAttempt((n) => n + 1) };
}
