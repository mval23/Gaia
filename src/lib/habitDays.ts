import { addDays, startOfWeek, toISODate, fromISODate } from './dates';

/** How many weeks the habit page shows above its month-by-month history. */
export const WEEKS_SHOWN = 9;

/**
 * The weeks that end with the one holding `today`, oldest first, each a row of
 * seven dates. The rows always start on the person's own first day of the week,
 * so the columns line up with every other week in Gaia.
 */
export function weeksEnding(today: string, weeks = WEEKS_SHOWN, weekStart = 0): string[][] {
  const thisWeek = startOfWeek(today, weekStart);
  const first = addDays(thisWeek, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)),
  );
}

/**
 * A day can be filled in from the day the habit began up to today. Tomorrow is
 * never offered: there is nothing yet to say about it.
 */
export function canFill(date: string, start: string, today: string): boolean {
  return date >= start && date <= today;
}

/** The day a habit began: whichever came first, making it or logging it. */
export function startedOn(createdAt: string, firstLogged?: string): string {
  const made = createdAt.slice(0, 10);
  return firstLogged && firstLogged < made ? firstLogged : made;
}

/** Every month from the one a habit began in to the one holding `today`, oldest first. */
export function monthsBetween(start: string, today: string): string[] {
  const out: string[] = [];
  const from = fromISODate(start);
  const to = fromISODate(today);
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    out.push(toISODate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}
