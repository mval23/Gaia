import type { Schedule, Task } from '../../types';
import { addDays, fromISODate } from '../../lib/dates';
import { splitIntoDays, type DayEvent } from '../../lib/calendar';
// Shared with the Google link, which decides the same way when to send a change.
export { blockSignature } from '../../lib/calendar';

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
export type OutlookEvent = DayEvent;

/** Graph's "2026-09-16T14:00:00.0000000" (UTC, no zone marker) as a Date. */
export function parseGraphUTC(value: string): Date {
  return new Date(`${value.replace(/\.\d+$/, '').replace(/Z$/, '')}Z`);
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
  return splitIntoDays(parseGraphUTC(event.start.dateTime), parseGraphUTC(event.end.dateTime), {
    eventId: event.id,
    calendarId,
    groupId,
    subject: event.subject?.trim() || '(No title)',
    source: 'Outlook',
    webLink: event.webLink,
  });
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

/** [start, end) of the local days in `dates`, for a calendarView request. */
export function rangeOf(dates: string[]): { from: string; to: string } {
  const sorted = [...dates].sort();
  return { from: sorted[0], to: addDays(sorted[sorted.length - 1], 1) };
}
