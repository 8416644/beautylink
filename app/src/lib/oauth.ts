import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Where Google sends the user back after she picks her account. Supabase must list it in
// Authentication → URL Configuration → Redirect URLs (beautylink://**, exp://** for
// Expo Go, and the web address).
export function oauthRedirect() {
  return Platform.OS === 'web'
    ? `${window.location.origin}/auth-callback`
    : Linking.createURL('auth-callback');
}

// Signs in from the link Google sign-in comes back with: ?code=… (swapped for a session),
// or older-style #access_token=…&refresh_token=…, or error_description=… on failure.
// True when signed in, false when the link holds nothing to sign in with.
export async function sessionFromUrl(url: string) {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));
  const problem = params.get('error_description') ?? params.get('error');
  if (problem) throw new Error(problem);

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // The same code may already have been used (by the sign-in screen, or by the
      // library on the web); then the user is signed in already.
      const { data } = await supabase.auth.getSession();
      if (data.session) return true;
      throw error;
    }
    return true;
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return true;
}

// Signs in with Google. On a phone it opens Google in an in-app browser and resolves once
// the user is back, signed in (true) or having closed it (false). On the web the whole page
// goes to Google and comes back to /auth-callback, so this never resolves there.
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = oauthRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return new Promise(() => {});

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  return sessionFromUrl(result.url);
}
