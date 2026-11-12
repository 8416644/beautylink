import { useCallback, useEffect, useState } from 'react';

import { useRefreshGeneration } from './refresh';
import { supabase } from './supabase';

export type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, icon')
    .eq('is_visible', true)
    .order('sort');
  if (error) throw error;
  return data;
}

export type Subcategory = { id: number; category_id: number; name: string; sort: number; is_visible: boolean };

// A category's treatments in their order. Clients get the visible ones only (the database
// returns hidden ones to admins, so they are filtered here too unless asked for).
export async function fetchSubcategoriesOf(categoryId: number, includeHidden = false): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, category_id, name, sort, is_visible')
    .eq('category_id', categoryId)
    .order('sort')
    .order('id');
  if (error) throw error;
  return includeHidden ? data : data.filter((s) => s.is_visible);
}

type CategoriesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; categories: Category[] };

export function useCategories() {
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const generation = useRefreshGeneration();

  useEffect(() => {
    let cancelled = false;
    fetchCategories().then(
      (categories) => !cancelled && setState({ status: 'ready', categories }),
      () => !cancelled && setState({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, generation]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}
