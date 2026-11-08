import { useSyncExternalStore } from 'react';

// Pull-to-refresh: pulling any screen down bumps this counter, and every data hook that
// reads it (useAsync and the few hand-written loaders) fetches its data again. What is on
// screen stays put while the fresh data loads, so nothing typed into a form is lost.
let generation = 0;
const listeners = new Set<() => void>();

export function triggerRefresh() {
  generation += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRefreshGeneration() {
  return useSyncExternalStore(subscribe, () => generation, () => generation);
}
