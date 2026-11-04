import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from './supabase';
import { removePicture, uploadPicture } from './upload';

// An ad in the home screen strip (see the ads migration). It leads to a pro's page, a
// category, or nowhere.
export type Ad = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  pro_id: string | null;
  category_slug: string | null;
  action_label: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  sort: number;
};

export type AdInput = Omit<Ad, 'id' | 'sort' | 'image_url'>;

const COLUMNS =
  'id, title, subtitle, image_url, pro_id, category_slug, action_label, starts_on, ends_on, is_active, sort';
const BUCKET = 'ads';

// The ads showing today. The database only returns those to anyone but an admin; an admin
// gets every ad, so the dates and switch are checked here too.
export async function fetchShowingAds(): Promise<Ad[]> {
  const { data, error } = await supabase.from('ads').select(COLUMNS).order('sort').order('created_at');
  if (error) throw error;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  return (data as Ad[]).filter(
    (ad) =>
      ad.is_active &&
      (ad.starts_on === null || ad.starts_on <= today) &&
      (ad.ends_on === null || ad.ends_on >= today),
  );
}

// The ads showing today that lead to this pro: her promotions, shown on her page.
export async function fetchProPromotions(proId: string): Promise<Ad[]> {
  return (await fetchShowingAds()).filter((ad) => ad.pro_id === proId);
}

// Every ad, for the admin.
export async function fetchAllAds(): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select(COLUMNS)
    .order('sort')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Ad[];
}

// What happens to an ad's picture when it is saved: kept as it is, a new photo uploaded,
// a photo from a pro's portfolio used by its link, or no picture.
export type AdPicture =
  | { kind: 'keep' }
  | { kind: 'upload'; asset: ImagePickerAsset }
  | { kind: 'portfolio'; url: string }
  | { kind: 'none' };

// Adds an ad (at the end of the strip) or updates one. A new picture replaces the old one.
export async function saveAd(input: AdInput, existing: Ad | null, picture: AdPicture, sort: number) {
  let image_url = existing?.image_url ?? null;
  let uploaded: string | null = null;
  if (picture.kind === 'upload') {
    uploaded = (await uploadPicture(BUCKET, 'ads', picture.asset)).publicUrl;
    image_url = uploaded;
  } else if (picture.kind === 'portfolio') {
    image_url = picture.url;
  } else if (picture.kind === 'none') {
    image_url = null;
  }

  const row = { ...input, image_url };
  const { error } = existing
    ? await supabase.from('ads').update(row).eq('id', existing.id)
    : await supabase.from('ads').insert({ ...row, sort });
  if (error) {
    if (uploaded) await removePicture(BUCKET, uploaded);
    throw error;
  }
  // The old picture is no longer used. Only uploads to the ads bucket are removed, never a
  // pro's portfolio photo.
  if (existing?.image_url && existing.image_url !== image_url) {
    await removePicture(BUCKET, existing.image_url);
  }
}

export async function setAdActive(id: string, isActive: boolean) {
  const { error } = await supabase.from('ads').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteAd(ad: Ad) {
  const { error } = await supabase.from('ads').delete().eq('id', ad.id);
  if (error) throw error;
  // Removes only an upload to the ads bucket; a portfolio photo's link is left alone.
  if (ad.image_url) await removePicture(BUCKET, ad.image_url);
}

// Approved pros an ad can lead to.
export async function fetchProChoices(): Promise<{ user_id: string; display_name: string }[]> {
  const { data, error } = await supabase
    .from('public_pros')
    .select('user_id, display_name')
    .order('display_name');
  if (error) throw error;
  return data;
}

// "1.12.2026" or "1/12/26" → "2026-12-01"; null when empty, undefined when not a date.
export function parseDay(input: string): string | null | undefined {
  const text = input.trim();
  if (text === '') return null;
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(text);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

// "2026-12-01" → "1.12.2026".
export function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return `${d}.${m}.${y}`;
}
