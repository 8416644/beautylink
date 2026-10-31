import { createClient } from '@supabase/supabase-js';

import { supabaseConfig } from './supabase-config';

// On the web the browser's own localStorage keeps the session, and sign-in
// redirects (Google, Apple) return the session in the URL.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
