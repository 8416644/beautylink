import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';

export const MAX_COMMENT_LENGTH = 500;

// The signed-in user's likes, shared by every heart on screen so they agree. A tap shows
// at once; the totals on the photo are kept by the database (portfolio_items.like_count),
// so a like also nudges the shown total here until the next load.
let owner: string | null = null;
let liked = new Set<string>();
const delta = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot = { liked, delta };

function emit() {
  snapshot = { liked: new Set(liked), delta: new Map(delta) };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Loads which of these photos the user liked (call when photos come on screen).
export async function loadMyLikes(photoIds: string[]) {
  if (!owner || photoIds.length === 0) return;
  const { data, error } = await supabase
    .from('photo_likes')
    .select('photo_id')
    .eq('user_id', owner)
    .in('photo_id', photoIds);
  if (error) return;
  data.forEach((row) => liked.add(row.photo_id as string));
  emit();
}

export function useLikes() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (owner !== userId) {
      owner = userId;
      liked = new Set();
      delta.clear();
      emit();
    }
  }, [userId]);
  return useSyncExternalStore(subscribe, () => snapshot);
}

export async function setLike(userId: string, photoId: string, like: boolean) {
  if (liked.has(photoId) === like) return;
  if (like) liked.add(photoId);
  else liked.delete(photoId);
  delta.set(photoId, (delta.get(photoId) ?? 0) + (like ? 1 : -1));
  emit();
  const { error } = like
    ? await supabase.from('photo_likes').insert({ photo_id: photoId, user_id: userId })
    : await supabase.from('photo_likes').delete().eq('photo_id', photoId).eq('user_id', userId);
  if (error) {
    if (like) liked.delete(photoId);
    else liked.add(photoId);
    delta.set(photoId, (delta.get(photoId) ?? 0) + (like ? -1 : 1));
    emit();
    throw error;
  }
}

export type PhotoDetails = {
  id: string;
  media_url: string;
  caption: string | null;
  pro_id: string;
  pro_name: string;
  like_count: number;
  comment_count: number;
};

// One photo with its pro's name; null when it is hidden or gone.
export async function fetchPhoto(id: string): Promise<PhotoDetails | null> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('id, media_url, caption, pro_id, like_count, comment_count, is_hidden')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_hidden) return null;
  const { data: pro } = await supabase
    .from('public_pros')
    .select('display_name')
    .eq('user_id', data.pro_id)
    .maybeSingle();
  if (!pro) return null;
  return {
    id: data.id,
    media_url: data.media_url,
    caption: data.caption,
    pro_id: data.pro_id,
    pro_name: pro.display_name as string,
    like_count: data.like_count,
    comment_count: data.comment_count,
  };
}

export type PhotoComment = {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export async function fetchComments(photoId: string): Promise<PhotoComment[]> {
  const { data, error } = await supabase
    .from('photo_comments')
    .select('id, user_id, author_name, body, created_at')
    .eq('photo_id', photoId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addComment(userId: string, photoId: string, body: string) {
  const { error } = await supabase
    .from('photo_comments')
    .insert({ photo_id: photoId, user_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('photo_comments').delete().eq('id', id);
  if (error) throw error;
}
