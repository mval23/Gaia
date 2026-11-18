import type { Schedule, Task } from '../../types';
import { fromISODate } from '../../lib/dates';
import { getGoogleToken } from '../../auth/google';

/** Google Calendar, only as far as Gaia needs it: list, add, change, remove. */

const BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getGoogleToken();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const said = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new GoogleApiError(response.status, said?.error?.message ?? `Google Calendar ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export interface GoogleCalendar {
  id: string;
  name: string;
  /** Only a calendar Gaia may add to is worth offering. */
  canEdit: boolean;
}

interface CalendarListEntry {
  id: string;
  summary: string;
  summaryOverride?: string;
  accessRole: string;
  primary?: boolean;
  deleted?: boolean;
}

/** The calendars this account can write to, the main one first. */
export async function listGoogleCalendars(): Promise<GoogleCalendar[]> {
  const out: GoogleCalendar[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ minAccessRole: 'writer', maxResults: '250' });
    if (pageToken) params.set('pageToken', pageToken);
    const page: { items?: CalendarListEntry[]; nextPageToken?: string } = await api(`/users/me/calendarList?${params}`);
    for (const entry of page.items ?? []) {
      if (entry.deleted) continue;
      out.push({
        id: entry.id,
        name: entry.summaryOverride || entry.summary || entry.id,
        canEdit: entry.accessRole === 'owner' || entry.accessRole === 'writer',
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export interface GoogleEventInput {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders?: { useDefault: boolean };
  source?: { title: string; url: string };
}

export async function createGoogleEvent(calendarId: string, event: GoogleEventInput): Promise<string> {
  const made = await api<{ id: string }>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
  return made.id;
}

export async function updateGoogleEvent(
  calendarId: string,
  eventId: string,
  event: GoogleEventInput,
): Promise<void> {
  await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(event),
  });
}

export async function deleteGoogleEvent(calendarId: string, eventId: string): Promise<void> {
  await api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}

/** A date and a minute of it, as the moment it is in UTC. */
function utcStamp(date: string, minutes: number): string {
  const d = fromISODate(date);
  d.setMinutes(minutes);
  return d.toISOString();
}

/**
 * One of Gaia's time blocks, as a Google event. Written in UTC so there is one
 * rule for it; Google shows it in whatever zone the person reads it in.
 *
 * Google's own reminders are left off: Gaia has its own, and two notifications
 * for the same block is one too many.
 */
export function toGoogleEvent(task: Task, schedule: Schedule): GoogleEventInput {
  return {
    summary: task.status === 'done' ? `✓ ${task.title}` : task.title,
    description: 'Planned in Gaia.',
    start: { dateTime: utcStamp(schedule.date, schedule.startMin), timeZone: 'UTC' },
    end: { dateTime: utcStamp(schedule.date, schedule.startMin + schedule.durationMin), timeZone: 'UTC' },
    reminders: { useDefault: false },
  };
}
