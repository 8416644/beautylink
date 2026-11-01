import { addDays, inIsrael } from './dates';
import { supabase } from './supabase';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
export type Location = 'salon' | 'client_home';

export const STATUS_TEXT: Record<AppointmentStatus, string> = {
  pending: 'ממתין לאישור',
  confirmed: 'מאושר',
  rejected: 'לא אושר',
  cancelled: 'בוטל',
  completed: 'התקיים',
  no_show: 'לא הגיעה',
};

// What the database functions report, as words the user can act on.
const ERROR_TEXT: Record<string, string> = {
  not_signed_in: 'צריך להתחבר כדי לקבוע תור.',
  service_unavailable: 'הטיפול הזה כבר לא זמין. כדאי לרענן את הדף.',
  own_service: 'אי אפשר לקבוע תור אצל עצמך. תורים ידניים מוסיפים מהיומן.',
  location_unavailable: 'בעלת המקצוע לא עובדת במקום שבחרת.',
  phone_required: 'צריך מספר טלפון, כדי שבעלת המקצוע תוכל ליצור איתך קשר.',
  slot_taken: 'השעה הזו כבר נתפסה. אפשר לבחור שעה אחרת.',
  not_found: 'התור לא נמצא. כדאי לרענן.',
  not_active: 'התור הזה כבר לא פעיל.',
  too_late:
    'כבר עבר מועד הביטול, ולכן התור כרוך בתשלום. לשינוי אפשר לפנות לבעלת המקצוע ישירות.',
  not_a_pro: 'רק בעלת מקצוע יכולה לעשות את זה.',
  name_required: 'צריך לכתוב את שם הלקוחה.',
  bad_range: 'שעת הסיום צריכה להיות אחרי שעת ההתחלה.',
  bad_change: 'אי אפשר לשנות את התור הזה כך.',
};

// The cancellation policy as clients see it, from the pro's cancellation_hours.
export function cancellationPolicy(hours: number) {
  return hours > 0
    ? `אפשר לבטל עד ${hours} שעות לפני התור. ביטול מאוחר יותר, או אי-הגעה, כרוכים בתשלום על התור.`
    : 'אפשר לבטל עד תחילת התור. אי-הגעה בלי ביטול כרוכה בתשלום על התור.';
}

export function errorText(error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
  return (message && ERROR_TEXT[message]) || 'משהו השתבש. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב.';
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

// A service's free start times, grouped by Israel day: { "2026-11-03": [{ at, time }] }.
export type Slot = { at: string; time: string };

export async function fetchFreeSlots(serviceId: string, from: string, days: number) {
  const rows = await rpc<{ starts_at: string }[]>('available_slots', {
    p_service: serviceId,
    p_from: from,
    p_days: days,
  });
  const byDay: Record<string, Slot[]> = {};
  for (const row of rows) {
    const { day, time } = inIsrael(row.starts_at);
    (byDay[day] ??= []).push({ at: row.starts_at, time });
  }
  return byDay;
}

export function bookAppointment(input: {
  serviceId: string;
  at: string;
  phone: string;
  note: string;
  atClientHome: boolean;
}) {
  return rpc<string>('book_appointment', {
    p_service: input.serviceId,
    p_starts_at: input.at,
    p_phone: input.phone,
    p_note: input.note,
    p_at_client_home: input.atClientHome,
  });
}

export type ClientAppointment = {
  id: string;
  pro_id: string;
  pro_name: string;
  city: string;
  address: string | null;
  service_name: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  location: Location;
  price_ils: number;
  client_note: string | null;
  cancellation_hours: number;
  can_cancel: boolean;
};

export function fetchMyAppointments() {
  return rpc<ClientAppointment[]>('my_appointments');
}

export function cancelAppointment(id: string) {
  return rpc<void>('cancel_appointment', { p_id: id });
}

// ---------------------------------------------------------------------------
// The pro's calendar
// ---------------------------------------------------------------------------

export type ProAppointment = {
  id: string;
  service_name: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: 'app' | 'manual';
  location: Location;
  price_ils: number;
  client_note: string | null;
  client: { name: string; phone: string | null } | null;
};

export type TimeOff = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: 'break' | 'vacation' | 'other';
  note: string | null;
};

export const TIME_OFF_TEXT: Record<TimeOff['kind'], string> = {
  break: 'הפסקה',
  vacation: 'חופש',
  other: 'חסום',
};

const APPOINTMENT_COLUMNS =
  'id, service_name, starts_at, ends_at, status, source, location, price_ils, client_note, ' +
  'client:pro_clients(name, phone)';

// Her appointments and blocked time that touch these Israel days. The query reaches a day
// past each end, then keeps what falls on the days asked for.
export async function fetchAgenda(proId: string, from: string, days: number) {
  const start = `${addDays(from, -1)}T00:00:00Z`;
  const end = `${addDays(from, days + 1)}T00:00:00Z`;
  const [appointments, blocks] = await Promise.all([
    supabase
      .from('appointments')
      .select(APPOINTMENT_COLUMNS)
      .eq('pro_id', proId)
      .gte('starts_at', start)
      .lt('starts_at', end)
      .order('starts_at'),
    supabase
      .from('time_off')
      .select('id, starts_at, ends_at, kind, note')
      .eq('pro_id', proId)
      .lt('starts_at', end)
      .gt('ends_at', start)
      .order('starts_at'),
  ]);
  if (appointments.error) throw appointments.error;
  if (blocks.error) throw blocks.error;
  const last = addDays(from, days - 1);
  const within = (day: string) => day >= from && day <= last;
  return {
    appointments: (appointments.data as unknown as ProAppointment[])
      .filter((a) => within(inIsrael(a.starts_at).day))
      .map((a) => ({ ...a, price_ils: Number(a.price_ils) })),
    blocks: (blocks.data as TimeOff[]).filter(
      (b) => inIsrael(b.starts_at).day <= last && inIsrael(b.ends_at).day >= from,
    ),
  };
}

// Requests from clients still waiting for her answer, soonest first.
export async function fetchPendingRequests(proId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('pro_id', proId)
    .eq('status', 'pending')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at');
  if (error) throw error;
  return (data as unknown as ProAppointment[]).map((a) => ({ ...a, price_ils: Number(a.price_ils) }));
}

export function setAppointmentStatus(id: string, status: AppointmentStatus) {
  return rpc<void>('set_appointment_status', { p_id: id, p_status: status });
}

export function addManualAppointment(input: {
  serviceId: string;
  day: string;
  time: string;
  clientName: string;
  phone: string;
  note: string;
}) {
  return rpc<string>('add_manual_appointment', {
    p_service: input.serviceId,
    p_date: input.day,
    p_time: input.time,
    p_client_name: input.clientName,
    p_phone: input.phone,
    p_note: input.note,
  });
}

// With no times, the whole day is blocked.
export function addTimeOff(input: {
  day: string;
  from: string | null;
  to: string | null;
  kind: TimeOff['kind'];
  note: string;
}) {
  return rpc<string>('add_time_off', {
    p_date: input.day,
    p_from: input.from,
    p_to: input.to,
    p_kind: input.kind,
    p_note: input.note,
  });
}

export async function deleteTimeOff(id: string) {
  const { error } = await supabase.from('time_off').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Her booking rules
// ---------------------------------------------------------------------------

export type BookingSettings = {
  booking_mode: 'instant' | 'request';
  cancellation_hours: number;
  slot_step_min: number;
};

export async function fetchBookingSettings(proId: string): Promise<BookingSettings | null> {
  const { data, error } = await supabase
    .from('pro_profiles')
    .select('booking_mode, cancellation_hours, slot_step_min')
    .eq('user_id', proId)
    .maybeSingle();
  if (error) throw error;
  return data as BookingSettings | null;
}

export async function saveBookingSettings(proId: string, settings: Partial<BookingSettings>) {
  const { error } = await supabase.from('pro_profiles').update(settings).eq('user_id', proId);
  if (error) throw error;
}
