import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string;
  role: 'client' | 'pro' | 'admin';
  // Agreed to receive updates and advertising by email.
  marketing_opt_in: boolean;
};

type AuthValue = {
  // True until the stored session has been read on launch.
  loading: boolean;
  session: Session | null;
  // The signed-in user's row in profiles; null while it loads.
  profile: Profile | null;
  // Reads the profile again after the user changed it.
  reloadProfile: () => void;
};

const AuthContext = createContext<AuthValue>({
  loading: true,
  session: null,
  profile: null,
  reloadProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      // Every column, so the app keeps working on a database that does not yet have the
      // newest ones.
      .select('*')
      .eq('id', userId)
      .single()
      .then(
        ({ data }) =>
          !cancelled &&
          setProfile(data ? ({ ...data, marketing_opt_in: data.marketing_opt_in === true } as Profile) : null),
      );
    return () => {
      cancelled = true;
    };
  }, [userId, profileVersion]);

  // A profile left over from a previous user does not count.
  const value: AuthValue = {
    loading,
    session,
    profile: profile?.id === userId ? profile : null,
    reloadProfile: () => setProfileVersion((n) => n + 1),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function signOut() {
  return supabase.auth.signOut();
}
