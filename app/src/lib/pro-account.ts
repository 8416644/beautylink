import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from './supabase';
import { removePicture, uploadPicture } from './upload';

export type ProStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';

// The fields a pro fills in herself. Status, approval and ratings are never sent from
// here: the admin and the database own them.
export type ProDetails = {
  display_name: string;
  bio: string;
  years_experience: number | null;
  city: string;
  neighborhood: string | null;
  // Her full address, and whether her page shows it to everyone (with a Waze button);
  // otherwise only clients with a confirmed appointment see it.
  address: string | null;
  show_address: boolean;
  works_at_salon: boolean;
  works_at_home: boolean;
  travels_to_client: boolean;
  travel_radius_km: number | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
};

export type OwnProProfile = ProDetails & {
  status: ProStatus;
  rejection_reason: string | null;
  // Her profile photo, shown across the top of her page.
  cover_url: string | null;
  subcategory_ids: number[];
};

export type Subcategory = { id: number; category_id: number; name: string };

export async function fetchSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, category_id, name')
    .eq('is_visible', true)
    .order('sort');
  if (error) throw error;
  return data;
}

export async function fetchOwnProProfile(userId: string): Promise<OwnProProfile | null> {
  const { data, error } = await supabase
    .from('pro_profiles')
    .select(
      'display_name, bio, years_experience, city, neighborhood, works_at_salon, works_at_home, ' +
        'travels_to_client, travel_radius_km, instagram_url, tiktok_url, facebook_url, status, ' +
        'address, show_address, ' +
        'rejection_reason, cover_url, pro_subcategories(subcategory_id)',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { pro_subcategories, ...rest } = data as unknown as Omit<OwnProProfile, 'subcategory_ids'> & {
    pro_subcategories: { subcategory_id: number }[];
  };
  return { ...rest, subcategory_ids: pro_subcategories.map((s) => s.subcategory_id) };
}

// Creates the pro profile, or updates it. A new, draft or rejected profile is (re)submitted
// for admin review; an approved or pending one keeps its status.
export async function saveProProfile(
  userId: string,
  details: ProDetails,
  subcategoryIds: number[],
  currentStatus: ProStatus | null,
) {
  if (currentStatus === null) {
    const { error } = await supabase
      .from('pro_profiles')
      .insert({ user_id: userId, ...details, status: 'pending' });
    if (error) throw error;
  } else {
    const resubmit = currentStatus === 'draft' || currentStatus === 'rejected';
    const { error } = await supabase
      .from('pro_profiles')
      .update(resubmit ? { ...details, status: 'pending', rejection_reason: null } : details)
      .eq('user_id', userId);
    if (error) throw error;
  }

  const { error: deleteError } = await supabase
    .from('pro_subcategories')
    .delete()
    .eq('pro_id', userId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase
    .from('pro_subcategories')
    .insert(subcategoryIds.map((id) => ({ pro_id: userId, subcategory_id: id })));
  if (insertError) throw insertError;
}

// Sets or removes her profile photo. A new photo goes to her folder in the portfolio
// bucket; the old one is removed once the profile no longer points to it.
export async function saveProCover(
  userId: string,
  change: { kind: 'upload'; asset: ImagePickerAsset } | { kind: 'none' },
  oldUrl: string | null,
) {
  const url = change.kind === 'upload' ? (await uploadPicture('portfolio', userId, change.asset)).publicUrl : null;
  const { error } = await supabase.from('pro_profiles').update({ cover_url: url }).eq('user_id', userId);
  if (error) {
    if (url) await removePicture('portfolio', url);
    throw error;
  }
  if (oldUrl && oldUrl !== url) await removePicture('portfolio', oldUrl);
}
