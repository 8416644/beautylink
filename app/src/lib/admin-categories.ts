import { supabase } from './supabase';
import type { Subcategory } from './categories';

// The admin's view of the categories and their treatments, hidden ones included (the
// database shows hidden rows to admins only; policies "categories admin" and
// "subcategories admin" let admins change them).
export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort: number;
  is_visible: boolean;
  subcategories: Subcategory[];
};

export async function fetchAllCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, icon, sort, is_visible, subcategories(id, category_id, name, sort, is_visible)')
    .order('sort')
    .order('id');
  if (error) throw error;
  return (data as unknown as AdminCategory[]).map((c) => ({
    ...c,
    subcategories: [...c.subcategories].sort((a, b) => a.sort - b.sort || a.id - b.id),
  }));
}

export async function addCategory(name: string, sort: number) {
  // A slug of its own, so its search link keeps working if the name changes later.
  const slug = `c${Date.now().toString(36)}`;
  const { error } = await supabase.from('categories').insert({ name, slug, sort, is_visible: true });
  if (error) throw error;
}

export async function updateCategory(id: number, changes: { name?: string; is_visible?: boolean }) {
  const { error } = await supabase.from('categories').update(changes).eq('id', id);
  if (error) throw error;
}

export async function addSubcategory(categoryId: number, name: string, sort: number) {
  const { error } = await supabase
    .from('subcategories')
    .insert({ category_id: categoryId, name, sort, is_visible: true });
  if (error) throw error;
}

export async function updateSubcategory(id: number, changes: { name?: string; is_visible?: boolean }) {
  const { error } = await supabase.from('subcategories').update(changes).eq('id', id);
  if (error) throw error;
}

// Saves a new order: each row gets its position as its sort value.
export async function saveOrder(table: 'categories' | 'subcategories', ids: number[]) {
  const results = await Promise.all(
    ids.map((id, index) => supabase.from(table).update({ sort: index + 1 }).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

// Supabase's message for a name that already exists in the same category.
export function nameErrorText(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '');
  if (message.includes('duplicate')) return 'כבר יש טיפול בשם הזה בתחום.';
  return 'השמירה לא הצליחה. כדאי לנסות שוב.';
}
