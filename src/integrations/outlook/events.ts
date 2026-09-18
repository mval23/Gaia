import type { Schedule, Task } from '../../types';
import { addDays, fromISODate, toISODate } from '../../lib/dates';
import { DAY_MIN } from '../../lib/time';

/** The fields Gaia reads from a Graph event. Times are UTC (see the Prefer header). */
export interface GraphEvent {
  id: string;
  subject?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  isAllDay?: boolean;
  isCancelled?: boolean;
  webLink?: string;
}

export interface GraphEventInput {
  subject: string;
  start: { dateTime: string; timeZone: 'UTC' };
  end: { dateTime: string; timeZone: 'UTC' };
  body?: { contentType: 'text'; content: string };
  isReminderOn?: boolean;
}

/** One day's slice of an Outlook event, positioned like a time block. */
export interface OutlookEvent {
  /** Unique per day, since a long event is split at midnight. */
  key: string;
  eventId: string;
  calendarId: string;
  groupId: string;
  subject: string;
  date: string;
  startMin: number;
  durationMin: number;
  webLink?: string;
}

/** Graph's "2026-09-16T14:00:00.0000000" (UTC, no zone marker) as a Date. */
export function parseGraphUTC(value: string): Date {
  return new Date(`${value.replace(/\.\d+$/, '').replace(/Z$/, '')}Z`);
}

function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Splits an event into local-day segments. All-day and cancelled events are
 * left out: the timeline has no all-day row, and a cancelled meeting is not time.
 */
export function eventSegments(
  event: GraphEvent,
  calendarId: string,
  groupId: string,
): OutlookEvent[] {
  if (event.isAllDay || event.isCancelled) return [];
  const start = parseGraphUTC(event.start.dateTime);
  const end = parseGraphUTC(event.end.dateTime);
  if (!(end > start)) return [];
  const out: OutlookEvent[] = [];
  let date = toISODate(start);
  const lastDate = toISODate(end);
  while (date <= lastDate) {
    const dayStart = fromISODate(date);
    const from = start > dayStart ? minutesOf(start) : 0;
    const to = date === lastDate ? minutesOf(end) : DAY_MIN;
    if (to > from) {
      out.push({
        key: `${event.id}|${date}`,
        eventId: event.id,
        calendarId,
        groupId,
        subject: event.subject?.trim() || '(No title)',
        date,
        startMin: from,
        durationMin: to - from,
        webLink: event.webLink,
      });
    }
    date = addDays(date, 1);
  }
  return out;
}

function utcStamp(date: string, minutes: number): string {
  const d = fromISODate(date);
  d.setMinutes(minutes);
  return d.toISOString().replace(/\.\d+Z$/, '');
}

export function toGraphEvent(task: Task, schedule: Schedule): GraphEventInput {
  return {
    subject: task.status === 'done' ? `✓ ${task.title}` : task.title,
    start: { dateTime: utcStamp(schedule.date, schedule.startMin), timeZone: 'UTC' },
    end: { dateTime: utcStamp(schedule.date, schedule.startMin + schedule.durationMin), timeZone: 'UTC' },
    body: { contentType: 'text', content: 'Planned in Gaia.' },
    isReminderOn: false,
  };
}

/** Changes whenever the Outlook copy of a block would need updating. */
export function blockSignature(task: Task, schedule: Schedule): string {
  return [task.title, task.status, schedule.date, schedule.startMin, schedule.durationMin].join('|');
}

/** [start, end) of the local days in `dates`, for a calendarView request. */
export function rangeOf(dates: string[]): { from: string; to: string } {
  const sorted = [...dates].sort();
  return { from: sorted[0], to: addDays(sorted[sorted.length - 1], 1) };
}
