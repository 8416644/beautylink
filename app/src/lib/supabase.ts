import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { supabaseConfig } from './supabase-config';

// On iOS and Android the session is kept in SQLite-backed localStorage,
// so users stay signed in between launches.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
