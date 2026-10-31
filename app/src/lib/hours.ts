import { supabase } from './supabase';

// One stretch of work on a weekday, times as "HH:MM". A day can have several (split shifts).
export type Shift = { weekday: number; start: string; end: string };

// 0 = Sunday, as in the working_hours table.
export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export async function fetchWorkingHours(proId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('working_hours')
    .select('weekday, start_time, end_time')
    .eq('pro_id', proId)
    .order('weekday')
    .order('start_time');
  if (error) throw error;
  return data.map((row) => ({
    weekday: row.weekday,
    start: (row.start_time as string).slice(0, 5),
    end: (row.end_time as string).slice(0, 5),
  }));
}

// Replaces her weekly hours. The new rows go in before the old ones are removed, so a
// failed save leaves her previous hours in place.
export async function saveWorkingHours(proId: string, shifts: Shift[]) {
  const { data: old, error: readError } = await supabase
    .from('working_hours')
    .select('id')
    .eq('pro_id', proId);
  if (readError) throw readError;

  if (shifts.length > 0) {
    const { error } = await supabase.from('working_hours').insert(
      shifts.map((s) => ({ pro_id: proId, weekday: s.weekday, start_time: s.start, end_time: s.end })),
    );
    if (error) throw error;
  }

  if (old.length > 0) {
    const { error } = await supabase
      .from('working_hours')
      .delete()
      .in('id', old.map((row) => row.id));
    if (error) throw error;
  }
}

// Reads what she typed as a time: "9" → "09:00", "930" → "09:30", "9:30" → "09:30".
// Null when it is not a time of day.
export function parseTime(input: string): string | null {
  const text = input.trim().replace('.', ':');
  const match = /^(\d{1,2})(?::?(\d{2}))?$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// "09:00–13:00, 16:00–20:00" for one day's shifts. The times are isolated as left to
// right, or a Hebrew line would show the range backwards, as "13:00–09:00".
export function formatShifts(shifts: Shift[]) {
  return shifts.map((s) => `⁦${s.start}–${s.end}⁩`).join(', ');
}
