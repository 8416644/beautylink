import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from './supabase';
import { removePicture, uploadPicture } from './upload';

export { MAX_PHOTO_BYTES, photoProblem, pickerOptions } from './upload';

// A photo in a pro's portfolio. The file lives in the "portfolio" storage bucket under
// <pro id>/, and media_url is its public link.
export type PortfolioItem = {
  id: string;
  media_url: string;
  caption: string | null;
  sort: number;
};

const BUCKET = 'portfolio';

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

// Uploads the photo to her folder and adds it at the top of her portfolio.
export async function addPhoto(proId: string, asset: ImagePickerAsset, sort: number) {
  const { path, publicUrl } = await uploadPicture(BUCKET, proId, asset);
  const { error } = await supabase
    .from('portfolio_items')
    .insert({ pro_id: proId, media_url: publicUrl, media_kind: 'image', sort });
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

// Removes the item, then its file.
export async function removePhoto(item: PortfolioItem) {
  const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);
  if (error) throw error;
  await removePicture(BUCKET, item.media_url);
}
