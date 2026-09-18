import { getToken } from '../../auth/microsoft';
import type { GraphEvent, GraphEventInput } from './events';

const BASE = 'https://graph.microsoft.com/v1.0';

export class GraphError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(path.startsWith('https://') ? path : `${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Every time comes back in UTC, so converting to local time is one rule.
      Prefer: 'outlook.timezone="UTC"',
      ...init.headers,
    },
  });
  if (!res.ok) throw new GraphError(res.status, `Microsoft Graph ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export interface OutlookCalendar {
  id: string;
  name: string;
  canEdit: boolean;
}

export async function listCalendars(): Promise<OutlookCalendar[]> {
  const data = await graph<{ value: OutlookCalendar[] }>('/me/calendars?$select=id,name,canEdit&$top=100');
  return data.value;
}

/** Every event overlapping [start, end), following Graph's paging. */
export async function calendarView(calendarId: string, start: Date, end: Date): Promise<GraphEvent[]> {
  const params = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    $select: 'id,subject,start,end,isAllDay,isCancelled,webLink',
    $top: '250',
  });
  const out: GraphEvent[] = [];
  let next: string | undefined = `/me/calendars/${encodeURIComponent(calendarId)}/calendarView?${params}`;
  while (next) {
    const page: { value: GraphEvent[]; '@odata.nextLink'?: string } = await graph(next);
    out.push(...page.value);
    next = page['@odata.nextLink'];
  }
  return out;
}

export async function createEvent(calendarId: string, event: GraphEventInput): Promise<string> {
  const created = await graph<{ id: string }>(`/me/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
  return created.id;
}

export async function updateEvent(eventId: string, event: GraphEventInput): Promise<void> {
  await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: JSON.stringify(event) });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await graph(`/me/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}
