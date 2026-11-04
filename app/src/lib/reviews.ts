import { supabase } from './supabase';

// A client's review of a completed appointment she booked in the app (the database checks
// both, see check_review_allowed). The pro's rating is recomputed from these.
export type Review = {
  id: string;
  rating: number;
  body: string;
  pro_reply: string | null;
  created_at: string;
  // The reviewer's first name only.
  client_name: string;
};

export const MAX_REVIEW_LENGTH = 1000;

// A pro's visible reviews, newest first. The admin can hide a review (is_hidden).
export async function fetchProReviews(proId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, body, pro_reply, created_at, profiles!reviews_client_user_id_fkey(full_name)')
    .eq('pro_id', proId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Row = Omit<Review, 'client_name'> & { profiles: { full_name: string } | null };
  return (data as unknown as Row[]).map(({ profiles, ...review }) => ({
    ...review,
    client_name: profiles?.full_name.trim().split(/\s+/)[0] || 'לקוחה',
  }));
}

// The reviews written about her, for the pro herself, including any the admin hid.
export async function fetchReviewsAboutMe(proId: string): Promise<(Review & { is_hidden: boolean })[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, body, pro_reply, created_at, is_hidden, profiles!reviews_client_user_id_fkey(full_name)')
    .eq('pro_id', proId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Row = Omit<Review, 'client_name'> & { is_hidden: boolean; profiles: { full_name: string } | null };
  return (data as unknown as Row[]).map(({ profiles, ...review }) => ({
    ...review,
    client_name: profiles?.full_name.trim().split(/\s+/)[0] || 'לקוחה',
  }));
}

// Her reply under a review about her; an empty reply removes it (see reply_to_review).
export async function replyToReview(reviewId: string, reply: string) {
  const { error } = await supabase.rpc('reply_to_review', { p_review: reviewId, p_reply: reply });
  if (error) throw error;
}

// The appointments she has already reviewed.
export async function fetchMyReviewedAppointmentIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('reviews').select('appointment_id').eq('client_user_id', userId);
  if (error) throw error;
  return new Set(data.map((r) => r.appointment_id as string));
}

export async function submitReview(input: {
  userId: string;
  appointmentId: string;
  proId: string;
  rating: number;
  body: string;
}) {
  const { error } = await supabase.from('reviews').insert({
    appointment_id: input.appointmentId,
    pro_id: input.proId,
    client_user_id: input.userId,
    rating: input.rating,
    body: input.body.trim().slice(0, MAX_REVIEW_LENGTH),
  });
  if (error) throw error;
}

// What went wrong, in words she can act on.
export function reviewErrorText(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)
    ? String((error as { message: unknown }).message)
    : '';
  if (code === '23505') return 'כבר כתבת ביקורת על התור הזה.';
  if (message.includes('completed appointment')) return 'אפשר לכתוב ביקורת רק על תור שהתקיים.';
  return 'לא הצלחנו לשמור את הביקורת. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.';
}
