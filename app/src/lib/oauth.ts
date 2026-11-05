import Constants, { ExecutionEnvironment } from 'expo-constants';
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

// The Google sign-in sheet built into Android (and iOS), available in the real app but not
// in Expo Go, whose native modules are fixed. Loaded lazily so Expo Go never touches it.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const canSignInNatively =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  !!WEB_CLIENT_ID;

async function signInWithGoogleNatively(): Promise<boolean> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );
  // Google issues the ID token for the web client, which is the one Supabase checks.
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return false;
    const token = response.data.idToken;
    if (!token) throw new Error('Google returned no ID token');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw error;
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return false;
    throw e;
  }
}

// Signs in with Google. In the real app on a phone it uses the phone's own Google account
// sheet. Elsewhere it goes through Google's web page: on a phone (Expo Go) in an in-app
// browser, resolving once the user is back, signed in (true) or having closed it (false);
// on the web the whole page goes to Google and comes back to /auth-callback, so this never
// resolves there.
export async function signInWithGoogle(): Promise<boolean> {
  if (canSignInNatively) return signInWithGoogleNatively();
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
