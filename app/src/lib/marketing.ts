import { Platform } from 'react-native';

import { supabase } from './supabase';

// The words of the consent, the same wherever it is asked.
export const MARKETING_CONSENT = 'אני מסכימה לקבל מ-BeautyLink עדכונים, מבצעים ופרסומות במייל';
export const MARKETING_CONSENT_PRO =
  'אני מסכימה לקבל מ-BeautyLink עדכונים למקצועיות, מבצעים והצעות פרסום במייל';
export const MARKETING_CONSENT_HINT = 'לא חובה. אפשר לבטל בכל רגע בפרופיל.';

// Turns the consent on or off for the signed-in user. The database records when.
export async function setMarketingOptIn(userId: string, value: boolean) {
  const { error } = await supabase.from('profiles').update({ marketing_opt_in: value }).eq('id', userId);
  if (error) throw error;
}

// Google sign-in on the web leaves the page and comes back, losing what was ticked; the
// choice waits in the tab's storage until the sign-in completes.
const PENDING_KEY = 'beautylink.pendingMarketingOptIn';

export function rememberOptInForRedirect(value: boolean) {
  if (Platform.OS !== 'web') return;
  try {
    if (value) window.sessionStorage.setItem(PENDING_KEY, '1');
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: the user can still turn it on from her profile.
  }
}

export async function applyOptInAfterRedirect(userId: string) {
  if (Platform.OS !== 'web') return;
  let pending = false;
  try {
    pending = window.sessionStorage.getItem(PENDING_KEY) === '1';
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    return;
  }
  if (pending) await setMarketingOptIn(userId, true);
}

export type MarketingContact = {
  full_name: string;
  email: string;
  is_pro: boolean;
  agreed_at: string | null;
};

// Everyone who agreed to receive email, for the admin.
export async function fetchMarketingList(): Promise<MarketingContact[]> {
  const { data, error } = await supabase.rpc('admin_marketing_list');
  if (error) throw error;
  return (data ?? []) as MarketingContact[];
}
