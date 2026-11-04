import { supabase } from './supabase';

export const FEED_PAGE = 24;

// A portfolio photo in the inspiration feed, with the pro it belongs to.
export type FeedPhoto = {
  id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  pro_id: string;
  pro_name: string;
};

// Approved pros who work in a category (through its subcategories).
async function prosInCategory(categoryId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('pro_subcategories')
    .select('pro_id, subcategories!inner(category_id)')
    .eq('subcategories.category_id', categoryId);
  if (error) throw error;
  return [...new Set(data.map((row) => row.pro_id as string))];
}

// The newest photos, a page at a time: pass the created_at of the last photo already shown
// to get the next page. The database only returns photos of approved pros.
export async function fetchFeedPage(
  categoryId: number | null,
  before: string | null,
): Promise<FeedPhoto[]> {
  let query = supabase
    .from('portfolio_items')
    .select('id, media_url, caption, created_at, pro_id')
    .eq('media_kind', 'image')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE);
  if (categoryId !== null) {
    const ids = await prosInCategory(categoryId);
    if (ids.length === 0) return [];
    query = query.in('pro_id', ids);
  }
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  if (data.length === 0) return [];

  const proIds = [...new Set(data.map((p) => p.pro_id as string))];
  const { data: pros, error: prosError } = await supabase
    .from('public_pros')
    .select('user_id, display_name')
    .in('user_id', proIds);
  if (prosError) throw prosError;
  const names = new Map(pros.map((p) => [p.user_id as string, p.display_name as string]));

  return data
    .filter((p) => names.has(p.pro_id as string))
    .map((p) => ({ ...(p as Omit<FeedPhoto, 'pro_name'>), pro_name: names.get(p.pro_id as string)! }));
}
