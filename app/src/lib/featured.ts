import { supabase } from './supabase';

// The pro the admin features on the home screen (see the featured pro migration).
export type FeaturedPro = {
  user_id: string;
  display_name: string;
  city: string;
  neighborhood: string | null;
  // Her profile photo, else her newest portfolio photo; null when she has neither.
  photo_url: string | null;
};

// The chosen pro's id, or null when none is chosen.
export async function fetchFeaturedProId(): Promise<string | null> {
  const { data, error } = await supabase.from('featured_pro').select('pro_id').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data?.pro_id ?? null;
}

// The featured pro as clients see her; null when none is chosen or she is not approved.
export async function fetchFeaturedPro(): Promise<FeaturedPro | null> {
  const proId = await fetchFeaturedProId();
  if (!proId) return null;
  const [pro, photo] = await Promise.all([
    supabase
      .from('public_pros')
      .select('user_id, display_name, city, neighborhood, cover_url')
      .eq('user_id', proId)
      .maybeSingle(),
    supabase
      .from('portfolio_items')
      .select('media_url')
      .eq('pro_id', proId)
      .eq('media_kind', 'image')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (pro.error) throw pro.error;
  if (!pro.data) return null;
  const { cover_url, ...rest } = pro.data;
  // Her profile photo, or her newest portfolio photo until she adds one.
  return { ...rest, photo_url: cover_url ?? photo.data?.media_url ?? null };
}

export async function setFeaturedPro(proId: string | null) {
  const { error } = await supabase
    .from('featured_pro')
    .update({ pro_id: proId, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}
