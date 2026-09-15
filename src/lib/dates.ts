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

/** Sunday-based week start, matching the Calendar reference. */
export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  return addDays(iso, -d.getDay());
}

export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 6x7 or 5x7 grid of dates covering the month, Sunday first. */
export function monthGrid(iso: string): { date: string; inMonth: boolean }[] {
  const d = fromISODate(iso);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
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
