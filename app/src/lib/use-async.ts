import { useEffect, useEffectEvent, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

type Settled<T> = { key: string } & ({ status: 'error' } | { status: 'ready'; data: T });

// Runs `load` whenever `key` changes (null means "not yet") and on reload().
// A result that belongs to an earlier key counts as still loading.
export function useAsync<T>(key: string | null, load: () => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fullKey = key === null ? null : `${key}#${attempt}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    if (fullKey === null) return;
    let cancelled = false;
    run().then(
      (data) => !cancelled && setSettled({ key: fullKey, status: 'ready', data }),
      () => !cancelled && setSettled({ key: fullKey, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [fullKey]);

  const state: AsyncState<T> =
    settled !== null && settled.key === fullKey ? settled : { status: 'loading' };
  return { state, reload: () => setAttempt((n) => n + 1) };
}
