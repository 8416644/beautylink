import type { ProSummary } from './pros';
import { supabase } from './supabase';

const SUMMARY =
  'user_id, display_name, city, neighborhood, works_at_salon, works_at_home, travels_to_client, ' +
  'rating_avg, rating_count';

const MAX_WORDS = 5;
const MAX_RESULTS = 60;

// Hebrew letters that cling to the front of a word: "בבני ברק", "לציפורניים", "והפאות".
const PREFIXES = 'ובהלמשכ';

// Free-text search over approved pros: their name, city, neighborhood or description, and the
// categories and treatments they work in. A part of a word is enough. Pros that match the
// whole phrase come first, then those that match the most words, best rated first among equals.
export async function searchPros(text: string): Promise<ProSummary[]> {
  // Characters PostgREST reads as syntax inside a filter are dropped.
  const clean = text.replace(/[,()%*\\"':.]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = [...new Set(clean.split(' ').filter((w) => w.length >= 2))].slice(0, MAX_WORDS);
  if (words.length === 0) {
    // A single letter still searches, as a part of a word.
    if (clean.length === 0) return [];
    words.push(clean);
  }

  const [phrase, ...perWord] = await Promise.all([
    words.length > 1 ? matchPatterns([clean]) : Promise.resolve(new Set<string>()),
    ...words.map((w) => matchPatterns(variants(w))),
  ]);

  const score = new Map<string, number>();
  perWord.forEach((set) => set.forEach((id) => score.set(id, (score.get(id) ?? 0) + 1)));
  // The whole phrase together outranks any count of separate words.
  phrase.forEach((id) => score.set(id, (score.get(id) ?? 0) + 100));
  if (score.size === 0) return [];

  const ids = [...score.keys()].sort((a, b) => score.get(b)! - score.get(a)!).slice(0, MAX_RESULTS);
  const { data, error } = await supabase.from('public_pros').select(SUMMARY).in('user_id', ids);
  if (error) throw error;
  const pros = data as unknown as ProSummary[];
  return pros.sort((a, b) => score.get(b.user_id)! - score.get(a.user_id)! || b.rating_avg - a.rating_avg);
}

// A word as typed, and without the letters a Hebrew word may carry in front ("בבני" -> "בני").
function variants(word: string): string[] {
  const out = [word];
  let w = word;
  for (let i = 0; i < 2 && w.length > 3 && PREFIXES.includes(w[0]); i++) {
    w = w.slice(1);
    out.push(w);
  }
  return out;
}

// The pros any of the patterns points to: through their own details, or through a category or
// treatment whose name contains it.
async function matchPatterns(patterns: string[]): Promise<Set<string>> {
  const likes = patterns.map((p) => `"%${p}%"`);
  const any = (columns: string[]) => columns.flatMap((c) => likes.map((l) => `${c}.ilike.${l}`)).join(',');

  const [pros, categories, subs] = await Promise.all([
    supabase.from('public_pros').select('user_id').or(any(['display_name', 'city', 'neighborhood', 'bio'])),
    supabase.from('categories').select('id').eq('is_visible', true).or(any(['name'])),
    supabase.from('subcategories').select('id').eq('is_visible', true).or(any(['name'])),
  ]);
  if (pros.error) throw pros.error;
  if (categories.error) throw categories.error;
  if (subs.error) throw subs.error;

  const ids = new Set(pros.data.map((p) => p.user_id as string));
  const categoryIds = categories.data.map((c) => c.id as number);
  const subIds = subs.data.map((s) => s.id as number);

  const links = await Promise.all([
    categoryIds.length > 0
      ? supabase
          .from('pro_subcategories')
          .select('pro_id, subcategories!inner(category_id)')
          .in('subcategories.category_id', categoryIds)
      : null,
    subIds.length > 0 ? supabase.from('pro_subcategories').select('pro_id').in('subcategory_id', subIds) : null,
  ]);
  for (const result of links) {
    if (!result) continue;
    if (result.error) throw result.error;
    result.data.forEach((l) => ids.add(l.pro_id as string));
  }
  return ids;
}
