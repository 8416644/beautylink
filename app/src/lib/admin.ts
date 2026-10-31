import type { ProDetails, ProStatus } from './pro-account';
import { supabase } from './supabase';

export type ProForReview = ProDetails & {
  user_id: string;
  status: ProStatus;
  rejection_reason: string | null;
  created_at: string;
  profiles: { full_name: string; phone: string | null } | null;
  pro_subcategories: { subcategories: { name: string } | null }[];
};

// Admins can read every pro_profiles row (policy "pro admin").
// profiles is named by its foreign key: favorites also links pro_profiles to profiles, so a
// bare "profiles" is ambiguous and the request fails.
export async function fetchProsByStatus(status: ProStatus): Promise<ProForReview[]> {
  const { data, error } = await supabase
    .from('pro_profiles')
    .select(
      'user_id, display_name, bio, years_experience, city, neighborhood, works_at_salon, ' +
        'works_at_home, travels_to_client, travel_radius_km, instagram_url, tiktok_url, ' +
        'facebook_url, status, ' +
        'rejection_reason, created_at, profiles!pro_profiles_user_id_fkey(full_name, phone), ' +
        'pro_subcategories(subcategories(name))',
    )
    .eq('status', status)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as unknown as ProForReview[];
}

// Changes a pro's approval status and records it in the admin action log.
export async function setProStatus(
  adminId: string,
  proId: string,
  status: 'approved' | 'rejected' | 'suspended',
  reason?: string,
) {
  const { error } = await supabase
    .from('pro_profiles')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason || null : null,
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    })
    .eq('user_id', proId);
  if (error) throw error;

  const { error: logError } = await supabase.from('admin_actions').insert({
    admin_id: adminId,
    action: `pro_${status}`,
    target_type: 'pro_profile',
    target_id: proId,
    details: reason ? { reason } : {},
  });
  if (logError) throw logError;
}
