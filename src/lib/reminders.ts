import type { GaiaState, Reminders } from '../types';
// The reminder server (api/) runs this file in Node, which needs the extensions spelled out.
import { addDays, dayOfWeek } from './dates.js';
import { DAY_MIN, formatClock, formatDuration } from './time.js';
import { NUDGE } from './copy.js';
import { blocksOnDate, habitsForDate, isGentleDay, reflectionFor } from '../store/selectors.js';

/** What a phone is sent. `key` is unique per nudge, so each one is sent once. */
export interface Nudge {
  key: string;
  /** Minutes from midnight when it's meant to arrive. */
  atMin: number;
  title: string;
  body: string;
  /** Where tapping it opens Gaia. */
  url: string;
}

/** What turning notifications on starts with. Every one can be turned off again. */
export const DEFAULT_REMINDERS: Reminders = {
  blocks: true,
  blockLeadMin: 5,
  morning: true,
  morningMin: 7 * 60 + 30,
  lookBack: true,
  lookBackMin: 19 * 60,
  evening: true,
  eveningMin: 21 * 60 + 30,
};

/** How late a nudge may still be sent. The server looks every five minutes. */
export const WINDOW_MIN = 15;

/** Everything Gaia would say on one day, whenever in the day it falls. */
export function nudgesOn(state: GaiaState, date: string): Nudge[] {
  const r = state.settings.reminders;
  if (!r) return [];
  const clock = (min: number) => formatClock(min, state.settings.timeFormat);
  const nudges: Nudge[] = [];

  if (r.blocks) {
    for (const task of state.tasks) {
      if (task.status === 'done' || task.status === 'let-go') continue;
      for (const b of blocksOnDate(task, date)) {
        const lead = Math.min(r.blockLeadMin, b.startMin);
        nudges.push({
          // The start time is part of the key, so moving a block sends it again at its new time.
          key: `block:${b.id}:${date}:${b.startMin}`,
          atMin: b.startMin - lead,
          title: task.title,
          body: `${lead > 0 ? `${NUDGE.blockSoon} ${clock(b.startMin)}` : NUDGE.blockNow} · ${formatDuration(b.durationMin)}`,
          url: `/?date=${date}`,
        });
      }
    }
  }

  if (r.morning) {
    const one = state.tasks.find((t) => t.essentialFor === date && t.status === 'open');
    if (one) {
      nudges.push({
        key: `morning:${date}`,
        atMin: r.morningMin,
        title: NUDGE.morningTitle,
        body: one.title,
        url: `/?date=${date}`,
      });
    }
  }

  if (r.lookBack) {
    const week = dayOfWeek(date) === state.settings.reflectionWeekday && !reflectionFor(state, 'week', date);
    const month = addDays(date, 1).endsWith('-01') && !reflectionFor(state, 'month', date);
    if (week || month) {
      nudges.push({
        key: `look-back:${date}`,
        atMin: r.lookBackMin,
        title: week && month ? NUDGE.bothTitle : month ? NUDGE.monthTitle : NUDGE.weekTitle,
        body: NUDGE.lookBackBody,
        url: `/look-back?date=${date}${month && !week ? '&period=month' : ''}`,
      });
    }
  }

  // Only on a day with nothing logged at all, and it never names what's left.
  if (r.evening && !isGentleDay(state, date)) {
    const quiet = habitsForDate(state, date).length > 0 && !state.checkIns.some((c) => c.date === date);
    if (quiet) {
      nudges.push({
        key: `evening:${date}`,
        atMin: r.eveningMin,
        title: NUDGE.eveningTitle,
        body: NUDGE.eveningBody,
        url: `/?date=${date}`,
      });
    }
  }

  return nudges;
}

/**
 * What's due at `nowMin` on `date`: anything meant for the last `windowMin`
 * minutes, including the end of the day before, just after midnight.
 */
export function dueNudges(state: GaiaState, date: string, nowMin: number, windowMin = WINDOW_MIN): Nudge[] {
  const today = nudgesOn(state, date).filter((n) => n.atMin <= nowMin && n.atMin > nowMin - windowMin);
  if (nowMin >= windowMin) return today;
  const lateYesterday = nudgesOn(state, addDays(date, -1)).filter((n) => n.atMin > nowMin + DAY_MIN - windowMin);
  return [...lateYesterday, ...today];
}

/** The date and minute it is right now on a phone's clock. */
export function localClock(timeZone: string, now = new Date()): { date: string; min: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}
