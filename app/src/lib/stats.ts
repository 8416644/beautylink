import { supabase } from './supabase';

export type StatsPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const STATS_PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: 'today', label: 'היום' },
  { key: 'week', label: 'השבוע' },
  { key: 'month', label: 'החודש' },
  { key: 'year', label: 'השנה' },
  { key: 'all', label: 'הכול' },
];

// What admin_stats() returns. "prev_*" is the same stretch of the period before, null for
// 'all'. series is visits per day (week, month) or per month (year, all), empty for today.
export type AdminStats = {
  from: string | null;
  online: number;
  visits: number;
  prev_visits: number | null;
  series: { start: string; count: number }[];
  signups: number;
  prev_signups: number | null;
  total_users: number;
  new_pros: number;
  pending_pros: number;
  approved_pros: number;
  booked: number;
  cancelled: number;
  reviews: number;
  reviews_avg: number | null;
  favorites: number;
  deleted_users: number;
  deleted_pros: number;
};

export async function fetchAdminStats(period: StatsPeriod): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats', { p_period: period });
  if (error) throw error;
  return data as AdminStats;
}
