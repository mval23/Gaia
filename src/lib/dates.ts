const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidISODate(iso: string | null | undefined): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(fromISODate(iso).getTime());
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = fromISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

/**
 * The first day of the week containing `iso`. `weekStart` is a weekday index:
 * 0 for Sunday, 1 for Monday. Defaults to Sunday, which is what the Calendar
 * reference used before the setting existed.
 */
export function startOfWeek(iso: string, weekStart = 0): string {
  const offset = (fromISODate(iso).getDay() - weekStart + 7) % 7;
  return addDays(iso, -offset);
}

export function weekDates(iso: string, weekStart = 0): string[] {
  const start = startOfWeek(iso, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The first day of the month containing `iso`: the key a monthly look back is filed under. */
export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Every date in the month containing `iso`, in order. */
export function monthDates(iso: string): string[] {
  const d = fromISODate(iso);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const first = startOfMonth(iso);
  return Array.from({ length: days }, (_, i) => addDays(first, i));
}

/** "September", for the month's own look back. */
export function monthName(iso: string, style: 'long' | 'short' = 'long'): string {
  return fromISODate(iso).toLocaleDateString('en-US', { month: style });
}

/** The weekday indexes of a week in order, for column headers. */
export function weekdayOrder(weekStart = 0): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

/** 6x7 or 5x7 grid of dates covering the month, starting on `weekStart`. */
export function monthGrid(iso: string, weekStart = 0): { date: string; inMonth: boolean }[] {
  const d = fromISODate(iso);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() - weekStart + 7) % 7;
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const start = addDays(toISODate(first), -lead);
  return Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: fromISODate(date).getMonth() === d.getMonth() };
  });
}

export function formatLongDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMonthYear(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatShortDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "since Tue" within the week, "since Sep 3" before that. Never a count of days. */
export function sinceLabel(iso: string, today: string): string {
  const days = Math.round((fromISODate(today).getTime() - fromISODate(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'since today';
  if (days === 1) return 'since yesterday';
  if (days < 7) return `since ${weekdayName(iso, 'short')}`;
  return `since ${formatShortDate(iso)}`;
}

export function weekdayName(iso: string, style: 'long' | 'short' = 'long'): string {
  return fromISODate(iso).toLocaleDateString('en-US', { weekday: style });
}

export function relativeDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return weekdayName(iso);
}

/** 0 = Sunday, matching startOfWeek and weekDates. */
export function dayOfWeek(iso: string): number {
  return fromISODate(iso).getDay();
}
