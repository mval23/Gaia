import type { Rhythm } from '../types';
import { dayOfWeek } from './dates';

/** A flexible rhythm is the default: it forgives a quiet day without any bookkeeping. */
export const DEFAULT_RHYTHM = { type: 'timesPerWeek', times: 3 } as const satisfies Rhythm;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Whether a habit belongs on a given day. A `timesPerWeek` habit belongs on
 * every day: how many times it has happened is a separate, softer question.
 */
export function isOnRhythm(rhythm: Rhythm, date: string): boolean {
  return rhythm.type === 'daysOfWeek' ? rhythm.days.includes(dayOfWeek(date)) : true;
}

/** How many times a week the person is aiming for. */
export function weeklyTarget(rhythm: Rhythm): number {
  return rhythm.type === 'daysOfWeek' ? rhythm.days.length : rhythm.times;
}

/** "Mon, Wed, Fri" · "about 3 times a week" · "every day" */
export function rhythmLabel(rhythm: Rhythm): string {
  if (rhythm.type === 'timesPerWeek') {
    return rhythm.times === 7 ? 'every day' : `about ${rhythm.times} times a week`;
  }
  if (rhythm.days.length === 7) return 'every day';
  if (rhythm.days.length === 0) return 'no days chosen yet';
  return [...rhythm.days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

/** Clamps anything stored or typed into a rhythm we can render. Shared with the save migration. */
export function normalizeRhythm(raw: unknown): Rhythm {
  const r = raw as Rhythm | undefined;
  if (r?.type === 'daysOfWeek') {
    const days = Array.isArray(r.days)
      ? [...new Set(r.days.map((d) => Math.trunc(Number(d))))].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
      : [];
    return days.length ? { type: 'daysOfWeek', days } : DEFAULT_RHYTHM;
  }
  if (r?.type === 'timesPerWeek') {
    const times = Math.trunc(Number(r.times));
    return { type: 'timesPerWeek', times: times >= 1 && times <= 7 ? times : DEFAULT_RHYTHM.times };
  }
  return DEFAULT_RHYTHM;
}
