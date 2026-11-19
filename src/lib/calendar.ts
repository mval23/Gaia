import type { Schedule, Task } from '../types';
import { addDays, fromISODate, toISODate } from './dates';
import { DAY_MIN } from './time';

/**
 * One slice of an event from a calendar kept elsewhere, placed on a single
 * day's timeline. An event running past midnight becomes one of these per day,
 * because a day is what the timeline draws.
 */
export interface DayEvent {
  /** Unique per day, since a long event is split at midnight. */
  key: string;
  eventId: string;
  /** The calendar it came from: an Outlook calendar id, or a feed's id. */
  calendarId: string;
  /** Whose colour it borrows. */
  groupId: string;
  subject: string;
  /** The calendar's name, for the label on the block. */
  source: string;
  date: string;
  startMin: number;
  durationMin: number;
  webLink?: string;
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/**
 * Cuts [start, end) into one piece per local day. Anything with no length
 * disappears, which is what should happen to a marker with no time in it.
 */
export function splitIntoDays(
  start: Date,
  end: Date,
  about: { eventId: string; calendarId: string; groupId: string; subject: string; source: string; webLink?: string },
): DayEvent[] {
  if (!(end > start)) return [];
  const out: DayEvent[] = [];
  let date = toISODate(start);
  const lastDate = toISODate(end);
  while (date <= lastDate) {
    const dayStart = fromISODate(date);
    const from = start > dayStart ? minutesOf(start) : 0;
    const to = date === lastDate ? minutesOf(end) : DAY_MIN;
    if (to > from) {
      out.push({ ...about, key: `${about.eventId}|${date}`, date, startMin: from, durationMin: to - from });
    }
    date = addDays(date, 1);
  }
  return out;
}

/**
 * Changes whenever the copy of a time block in an outside calendar would need
 * updating, so nothing is sent that would say the same thing twice.
 */
export function blockSignature(task: Task, schedule: Schedule): string {
  return [task.title, task.status, schedule.date, schedule.startMin, schedule.durationMin].join('|');
}

/** Several calendars' days, gathered into one map with each day in time order. */
export function mergeEventDays(...maps: Map<string, DayEvent[]>[]): Map<string, DayEvent[]> {
  const all = new Map<string, DayEvent[]>();
  for (const map of maps) {
    for (const [date, events] of map) {
      const list = all.get(date);
      if (list) list.push(...events);
      else all.set(date, [...events]);
    }
  }
  for (const list of all.values()) list.sort((a, b) => a.startMin - b.startMin);
  return all;
}
