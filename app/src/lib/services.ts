import { supabase } from './supabase';

// A treatment a pro offers, with its price and length. A hidden one (is_active false)
// stays in her list but clients do not see it.
export type Service = {
  id: string;
  subcategory_id: number;
  name: string;
  description: string;
  duration_min: number;
  price_ils: number;
  is_active: boolean;
  sort: number;
};

export type ServiceInput = Pick<
  Service,
  'subcategory_id' | 'name' | 'description' | 'duration_min' | 'price_ils'
>;

const COLUMNS = 'id, subcategory_id, name, description, duration_min, price_ils, is_active, sort';

// numeric columns can arrive as strings; the app works with numbers.
function toService(row: Service): Service {
  return { ...row, price_ils: Number(row.price_ils) };
}

export async function fetchOwnServices(proId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(COLUMNS)
    .eq('pro_id', proId)
    .order('sort')
    .order('name');
  if (error) throw error;
  return (data as Service[]).map(toService);
}

// The services clients see on a pro's page.
export async function fetchActiveServices(proId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(COLUMNS)
    .eq('pro_id', proId)
    .eq('is_active', true)
    .order('sort')
    .order('name');
  if (error) throw error;
  return (data as Service[]).map(toService);
}

// Adds a service at the end of her list, or updates an existing one.
export async function saveService(proId: string, input: ServiceInput, id: string | null, sort: number) {
  const { error } = id
    ? await supabase.from('services').update(input).eq('id', id)
    : await supabase.from('services').insert({ ...input, pro_id: proId, sort });
  if (error) throw error;
}

export async function setServiceActive(id: string, isActive: boolean) {
  const { error } = await supabase.from('services').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursText = hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : `${hours} שעות`;
  if (hours === 0) return `${rest} דק'`;
  if (rest === 0) return hoursText;
  if (rest === 30) return `${hoursText} וחצי`;
  return `${hoursText} ו-${rest} דק'`;
}

export function formatPrice(price: number) {
  return `${Number.isInteger(price) ? price : price.toFixed(2)} ₪`;
}
