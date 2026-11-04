import type { ImagePickerAsset, ImagePickerOptions } from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Picture uploads to the public storage buckets (portfolio, ads). Each bucket accepts only
// these types, up to 5 MB (see their migrations).
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Picker options shared by the gallery and the camera. A phone returns the photo's data as
// base64, which uploadPicture sends.
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

// Uploads a picked photo under folder/ in the bucket; returns its path and public link.
export async function uploadPicture(bucket: string, folder: string, asset: ImagePickerAsset) {
  const type = (asset.mimeType ?? asset.file?.type)!;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TYPES[type]}`;
  // On the web the picker gives a File. On a phone, reading the local uri with fetch gives
  // an empty body, so the picker is asked for the photo as base64 (see pickerOptions).
  const body = asset.file ?? (asset.base64 ? base64ToBytes(asset.base64) : null);
  if (!body) throw new Error('The picked photo has no data');

  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type, upsert: false });
  if (error) throw error;
  return { path, publicUrl: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

// Removes the file behind a public link of the bucket. A file that fails to delete only
// takes up space, so errors are ignored.
export async function removePicture(bucket: string, publicUrl: string) {
  const marker = `/object/public/${bucket}/`;
  const at = publicUrl.indexOf(marker);
  if (at !== -1) await supabase.storage.from(bucket).remove([publicUrl.slice(at + marker.length)]);
}
