import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { supabaseConfig } from './supabase-config';

// On iOS and Android the session is kept in SQLite-backed localStorage,
// so users stay signed in between launches.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Links back from Google (and from sign-up or password emails) carry a one-time
    // ?code= in the address, not tokens after a #: on Android the part after # can get
    // lost on its way from the browser to the app. The code is swapped for a session
    // with a secret kept on this device. On the web the library does this itself.
    flowType: 'pkce',
    detectSessionInUrl: Platform.OS === 'web',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
