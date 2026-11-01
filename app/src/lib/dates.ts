import { WEEKDAYS } from './hours';

// The app's calendar runs on Israel time, whatever the phone is set to, so a pro's
// "10:00" means the same moment to her and to her clients. Days are "YYYY-MM-DD" strings.
const TIME_ZONE = 'Asia/Jerusalem';

const israelParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// The Israel day and time of a moment: { day: "2026-11-01", time: "09:30" }.
export function inIsrael(moment: string | Date): { day: string; time: string } {
  const parts: Record<string, string> = {};
  for (const part of israelParts.formatToParts(new Date(moment))) parts[part.type] = part.value;
  // Some engines write midnight as "24".
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${hour}:${parts.minute}` };
}

export function today() {
  return inIsrael(new Date()).day;
}

// Calendar arithmetic on day strings, done at noon UTC so it never crosses a day boundary.
function noon(day: string) {
  return new Date(`${day}T12:00:00Z`);
}

export function addDays(day: string, count: number) {
  const date = noon(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

// 0 = Sunday, as in WEEKDAYS and the working_hours table.
export function weekdayOf(day: string) {
  return noon(day).getUTCDay();
}

// "1.11"
export function shortDate(day: string) {
  const [, month, date] = day.split('-');
  return `${Number(date)}.${Number(month)}`;
}

// "היום", "מחר", or "יום שלישי, 3.11".
export function dayLabel(day: string) {
  const now = today();
  if (day === now) return `היום, ${shortDate(day)}`;
  if (day === addDays(now, 1)) return `מחר, ${shortDate(day)}`;
  return `יום ${WEEKDAYS[weekdayOf(day)]}, ${shortDate(day)}`;
}

// A short weekday name for the day picker: "א׳" … "ש׳".
export const WEEKDAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// The days from `from`, `count` of them.
export function daysFrom(from: string, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

// A time written as left to right, so "10:00–11:00" does not flip in a Hebrew line.
export function ltr(text: string) {
  return `⁦${text}⁩`;
}
