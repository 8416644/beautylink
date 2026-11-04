import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { supabase } from './supabase';

const DEVICE_KEY = 'beautylink.device-id';
// How often an open app says it is still here; the stats screen counts a device as online
// for 3 minutes after it was last seen.
const HEARTBEAT_MS = 60_000;

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// A random id kept on this phone or browser, so a device counts once a day however often
// it opens the app. It says nothing about who the user is.
function deviceId() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const id = newId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return null;
  }
}

function track() {
  const id = deviceId();
  if (!id) return;
  // Counting visits must never get in the way of using the app.
  supabase.rpc('track_visit', { p_device: id }).then(
    () => {},
    () => {},
  );
}

// Reports the visit when the app opens or comes back to the front, and once a minute while
// it stays open. Runs again on sign-in, so the device is linked to the user.
export function useVisitTracking() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      track();
      if (timer === null) timer = setInterval(track, HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState !== 'background') start();
    const sub = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    );
    return () => {
      stop();
      sub.remove();
    };
  }, [userId]);
}

// Placed once inside AuthProvider.
export function VisitTracker() {
  useVisitTracking();
  return null;
}
