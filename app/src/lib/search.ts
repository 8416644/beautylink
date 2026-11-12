import type { ProSummary } from './pros';
import { supabase } from './supabase';

const SUMMARY =
  'user_id, display_name, city, neighborhood, works_at_salon, works_at_home, travels_to_client, ' +
  'rating_avg, rating_count';

// Free-text search over approved pros: their name, city, neighborhood or description, and
// the categories and treatments they work in. Each word must match something.
export async function searchPros(text: string): Promise<ProSummary[]> {
  // Characters PostgREST reads as syntax inside a filter are dropped.
  const words = text
    .replace(/[,()%*\\"']/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 4);
  if (words.length === 0) return [];

  const perWord = await Promise.all(words.map(matchWord));
  // Pros that match every word, best rated first.
  const [first, ...rest] = perWord;
  const ids = [...first].filter((id) => rest.every((set) => set.has(id)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('public_pros')
    .select(SUMMARY)
    .in('user_id', ids)
    .order('rating_avg', { ascending: false });
  if (error) throw error;
  return data as unknown as ProSummary[];
}

// The pros one word points to: through their own details, or through a category or
// treatment whose name contains it.
async function matchWord(word: string): Promise<Set<string>> {
  const like = `%${word}%`;
  const [pros, categories, subs] = await Promise.all([
    supabase
      .from('public_pros')
      .select('user_id')
      .or(`display_name.ilike.${like},city.ilike.${like},neighborhood.ilike.${like},bio.ilike.${like}`),
    supabase.from('categories').select('id').eq('is_visible', true).ilike('name', like),
    supabase.from('subcategories').select('id, category_id').eq('is_visible', true).ilike('name', like),
  ]);
  if (pros.error) throw pros.error;
  if (categories.error) throw categories.error;
  if (subs.error) throw subs.error;

  const ids = new Set(pros.data.map((p) => p.user_id as string));
  const subIds = subs.data.map((s) => s.id as number);
  const categoryIds = categories.data.map((c) => c.id as number);

  if (categoryIds.length > 0) {
    const { data, error } = await supabase
      .from('pro_subcategories')
      .select('pro_id, subcategories!inner(category_id)')
      .in('subcategories.category_id', categoryIds);
    if (error) throw error;
    data.forEach((l) => ids.add(l.pro_id as string));
  }
  if (subIds.length > 0) {
    const { data, error } = await supabase.from('pro_subcategories').select('pro_id').in('subcategory_id', subIds);
    if (error) throw error;
    data.forEach((l) => ids.add(l.pro_id as string));
  }
  return ids;
}
