import type { ImagePickerAsset, ImagePickerOptions } from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// A photo in a pro's portfolio. The file lives in the "portfolio" storage bucket under
// <pro id>/, and media_url is its public link.
export type PortfolioItem = {
  id: string;
  media_url: string;
  caption: string | null;
  sort: number;
};

const BUCKET = 'portfolio';
// The bucket itself accepts only these, up to 5 MB (see the portfolio storage migration).
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function fetchPortfolio(proId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('id, media_url, caption, sort')
    .eq('pro_id', proId)
    .eq('media_kind', 'image')
    .order('sort', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Picker options shared by the gallery and the camera. A phone returns the photo's data as
// base64, which addPhoto uploads.
export const pickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  base64: Platform.OS !== 'web',
} satisfies ImagePickerOptions;

function base64ToBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Why a picked photo cannot be uploaded, or null when it can.
export function photoProblem(asset: ImagePickerAsset): string | null {
  const type = asset.mimeType ?? asset.file?.type;
  if (!type || !TYPES[type]) return 'אפשר להעלות רק תמונות מסוג JPG, PNG או WebP.';
  const size = asset.fileSize ?? asset.file?.size;
  if (size !== undefined && size > MAX_PHOTO_BYTES) return 'התמונה גדולה מדי. אפשר עד 5MB.';
  return null;
}

// Uploads the photo to her folder and adds it at the top of her portfolio.
export async function addPhoto(proId: string, asset: ImagePickerAsset, sort: number) {
  const type = (asset.mimeType ?? asset.file?.type)!;
  const path = `${proId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TYPES[type]}`;
  // On the web the picker gives a File. On a phone, reading the local uri with fetch gives
  // an empty body, so the picker is asked for the photo as base64 (see pickerOptions).
  const body = asset.file ?? (asset.base64 ? base64ToBytes(asset.base64) : null);
  if (!body) throw new Error('The picked photo has no data');

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: type, upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error } = await supabase
    .from('portfolio_items')
    .insert({ pro_id: proId, media_url: data.publicUrl, media_kind: 'image', sort });
  if (error) {
    // Do not leave a file behind that no portfolio item points to.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function updateCaption(id: string, caption: string) {
  const { error } = await supabase
    .from('portfolio_items')
    .update({ caption: caption.trim() || null })
    .eq('id', id);
  if (error) throw error;
}

// Removes the item, then its file. A file that fails to delete only takes up space.
export async function removePhoto(item: PortfolioItem) {
  const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);
  if (error) throw error;
  const marker = `/object/public/${BUCKET}/`;
  const at = item.media_url.indexOf(marker);
  if (at !== -1) {
    await supabase.storage.from(BUCKET).remove([item.media_url.slice(at + marker.length)]);
  }
}
