import type { ImagePickerAsset } from 'expo-image-picker';

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
  // On the web the picker gives a File; on a phone the photo is read from its local uri.
  const body = asset.file ?? (await (await fetch(asset.uri)).arrayBuffer());

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
