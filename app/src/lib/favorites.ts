import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from './auth';
import type { ProSummary } from './pros';
import { supabase } from './supabase';

// The signed-in client's saved pros, shared by every heart on screen so they all agree.
// Loaded once per user; a tap changes it at once and is undone if saving fails.
let owner: string | null = null;
let ids = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  ids = new Set(ids);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function load(userId: string) {
  if (loadedFor === userId) return;
  loadedFor = userId;
  const { data, error } = await supabase
    .from('favorites')
    .select('pro_id')
    .eq('client_user_id', userId);
  if (error) {
    loadedFor = null;
    return;
  }
  if (owner !== userId) return;
  ids = new Set(data.map((row) => row.pro_id as string));
  emit();
}

// The saved pro ids of whoever is signed in (empty when nobody is).
export function useFavoriteIds() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (owner !== userId) {
      owner = userId;
      loadedFor = null;
      ids = new Set();
      emit();
    }
    if (userId) load(userId);
  }, [userId]);
  return useSyncExternalStore(subscribe, () => ids);
}

export async function setFavorite(userId: string, proId: string, saved: boolean) {
  const before = ids.has(proId);
  if (saved) ids.add(proId);
  else ids.delete(proId);
  emit();
  const { error } = saved
    ? await supabase
        .from('favorites')
        .upsert({ client_user_id: userId, pro_id: proId }, { ignoreDuplicates: true })
    : await supabase.from('favorites').delete().eq('client_user_id', userId).eq('pro_id', proId);
  if (error) {
    if (before) ids.add(proId);
    else ids.delete(proId);
    emit();
    throw error;
  }
}

export type FavoritePro = ProSummary & { cover_url: string | null };

// Her saved pros that are still approved, newest saved first.
export async function fetchMyFavorites(userId: string): Promise<FavoritePro[]> {
  const { data: rows, error } = await supabase
    .from('favorites')
    .select('pro_id, created_at')
    .eq('client_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const order = rows.map((r) => r.pro_id as string);
  if (order.length === 0) return [];

  const { data, error: prosError } = await supabase
    .from('public_pros')
    .select(
      'user_id, display_name, city, neighborhood, works_at_salon, works_at_home, ' +
        'travels_to_client, rating_avg, rating_count, cover_url',
    )
    .in('user_id', order);
  if (prosError) throw prosError;
  const pros = data as unknown as FavoritePro[];
  return order.map((id) => pros.find((p) => p.user_id === id)).filter((p) => p !== undefined);
}
