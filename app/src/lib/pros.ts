import { useEffect, useState } from 'react';

import { supabase } from './supabase';

// A pro as clients see her, read from the public_pros view (approved pros only, no address).
export type ProSummary = {
  user_id: string;
  display_name: string;
  city: string;
  neighborhood: string | null;
  works_at_salon: boolean;
  works_at_home: boolean;
  travels_to_client: boolean;
  rating_avg: number;
  rating_count: number;
};

export async function fetchProsInCategory(categoryId: number): Promise<ProSummary[]> {
  // A pro belongs to a category through the subcategories she works in.
  const { data: links, error: linksError } = await supabase
    .from('pro_subcategories')
    .select('pro_id, subcategories!inner(category_id)')
    .eq('subcategories.category_id', categoryId);
  if (linksError) throw linksError;

  const proIds = [...new Set(links.map((link) => link.pro_id as string))];
  if (proIds.length === 0) return [];

  const { data, error } = await supabase
    .from('public_pros')
    .select(
      'user_id, display_name, city, neighborhood, works_at_salon, works_at_home, ' +
        'travels_to_client, rating_avg, rating_count',
    )
    .in('user_id', proIds)
    .order('rating_avg', { ascending: false });
  if (error) throw error;
  return data as unknown as ProSummary[];
}

// Everything a client sees on a pro's page.
export type PublicPro = ProSummary & {
  bio: string;
  years_experience: number | null;
  travel_radius_km: number | null;
  travel_fee_ils: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  // Her subcategories, grouped under their category, in the app's order.
  services: { category: string; names: string[] }[];
};

type ServiceLink = {
  subcategories: { name: string; sort: number; categories: { name: string; sort: number } | null } | null;
};

// Null when there is no approved pro with this id.
export async function fetchPublicPro(id: string): Promise<PublicPro | null> {
  const [pro, links] = await Promise.all([
    supabase
      .from('public_pros')
      .select(
        'user_id, display_name, bio, years_experience, city, neighborhood, works_at_salon, ' +
          'works_at_home, travels_to_client, travel_radius_km, travel_fee_ils, instagram_url, ' +
          'tiktok_url, facebook_url, rating_avg, rating_count',
      )
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('pro_subcategories')
      .select('subcategories(name, sort, categories(name, sort))')
      .eq('pro_id', id),
  ]);
  if (pro.error) throw pro.error;
  if (links.error) throw links.error;
  if (!pro.data) return null;

  const subs = (links.data as unknown as ServiceLink[])
    .map((l) => l.subcategories)
    .filter((s) => s !== null)
    .sort((a, b) => (a.categories?.sort ?? 0) - (b.categories?.sort ?? 0) || a.sort - b.sort);
  const services: PublicPro['services'] = [];
  for (const sub of subs) {
    const category = sub.categories?.name ?? '';
    const group = services.find((g) => g.category === category);
    if (group) group.names.push(sub.name);
    else services.push({ category, names: [sub.name] });
  }

  return { ...(pro.data as unknown as Omit<PublicPro, 'services'>), services };
}

type ProsResult =
  | { key: string; status: 'error' }
  | { key: string; status: 'ready'; pros: ProSummary[] };

export type ProsState = { status: 'loading' } | ProsResult;

export function useProsInCategory(categoryId: number | undefined) {
  const [result, setResult] = useState<ProsResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${categoryId}:${attempt}`;

  useEffect(() => {
    if (categoryId === undefined) return;
    let cancelled = false;
    fetchProsInCategory(categoryId).then(
      (pros) => !cancelled && setResult({ key, status: 'ready', pros }),
      () => !cancelled && setResult({ key, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [categoryId, key]);

  // A result for an earlier category or attempt counts as still loading.
  const state: ProsState = result?.key === key ? result : { status: 'loading' };
  return { state, retry: () => setAttempt((n) => n + 1) };
}
