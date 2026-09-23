import type { Repeat } from '../types';
import { addDays, fromISODate } from './dates';

export const DEFAULT_REPEAT: Repeat = { type: 'everyDays', days: 7 };

/** Keeps a stored repeat usable: real weekdays, or a whole number of days. */
export function normalizeRepeat(raw: Repeat | undefined): Repeat | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  if (raw.type === 'daysOfWeek') {
    const days = Array.isArray(raw.days) ? [...new Set(raw.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
    return days.length ? { type: 'daysOfWeek', days: days.sort((a, b) => a - b) } : undefined;
  }
  if (raw.type === 'everyDays') {
    const days = Math.round(Number(raw.days));
    return Number.isFinite(days) && days >= 1 ? { type: 'everyDays', days: Math.min(days, 365) } : undefined;
  }
  return undefined;
}

/**
 * The day the next one is for, counted from the day this one was finished — so
 * a fortnight away leaves one task waiting, never fourteen.
 */
export function nextRepeatDate(repeat: Repeat, from: string): string {
  if (repeat.type === 'everyDays') return addDays(from, repeat.days);
  for (let i = 1; i <= 7; i++) {
    const date = addDays(from, i);
    if (repeat.days.includes(fromISODate(date).getDay())) return date;
  }
  return addDays(from, 7);
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "every Wednesday", "every 2 weeks" — never "due". */
export function repeatLabel(repeat: Repeat): string {
  if (repeat.type === 'everyDays') {
    if (repeat.days === 1) return 'every day';
    if (repeat.days === 7) return 'every week';
    if (repeat.days % 7 === 0) return `every ${repeat.days / 7} weeks`;
    return `every ${repeat.days} days`;
  }
  if (repeat.days.length === 7) return 'every day';
  if (repeat.days.length === 5 && [1, 2, 3, 4, 5].every((d) => repeat.days.includes(d))) return 'every weekday';
  if (repeat.days.length === 1) return `every ${DAY_NAMES[repeat.days[0]]}`;
  return `every ${repeat.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')}`;
}
