/**
 * Reading a calendar someone else keeps: the iCalendar (.ics) feed that Google,
 * Apple, Outlook.com and Notion all publish from a secret address.
 *
 * Only enough of RFC 5545 to put meetings on a day: when each one starts, how
 * long it runs, what it is called, and which ones repeat. Nothing is written
 * back, and nothing here reads a description or an attendee list.
 *
 * All-day entries are left out, as they are for Outlook: the timeline has no
 * all-day row, and a birthday is not time taken out of a day.
 */

/** One occurrence, already placed on the clock. */
export interface IcsEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** A moment, plus whether it was written as a plain date (an all-day entry). */
interface Moment {
  at: Date;
  dateOnly: boolean;
}

interface RawEvent {
  uid: string;
  summary: string;
  start: Moment | null;
  end: Moment | null;
  durationMs: number | null;
  rrule: string | null;
  exdates: number[];
  /** Set when this entry replaces one occurrence of a repeating event. */
  recurrenceId: Moment | null;
  cancelled: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
/** A runaway rule never spins forever; a year of any sane calendar fits well inside this. */
const MAX_OCCURRENCES = 2000;

/**
 * Puts folded lines back together. iCalendar wraps long lines by starting the
 * continuation with a space or tab.
 */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const line of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

/** `DTSTART;TZID=America/Bogota:20260916T140000` → name, params and value. */
function parseLine(line: string): Property | null {
  const colon = indexOfValueColon(line);
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...rest] = head.split(';');
  const params: Record<string, string> = {};
  for (const part of rest) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** The first colon that isn't inside a quoted parameter. */
function indexOfValueColon(line: string): number {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ':' && !quoted) return i;
  }
  return -1;
}

/** `\,` `\;` `\n` as iCalendar escapes them. */
function unescapeText(value: string): string {
  return value.replace(/\\([,;\\nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
}

/**
 * How far `timeZone` is from UTC at that moment, in minutes. Reading the parts
 * back out of a formatter is the one way to do this without shipping a tz
 * database.
 */
function offsetMinutes(timeZone: string, at: Date): number {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(at)
        .map((p) => [p.type, p.value]),
    );
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return Math.round((asUTC - at.getTime()) / 60000);
  } catch {
    // An unknown zone name is better read as the reader's own time than dropped.
    return -at.getTimezoneOffset();
  }
}

/** A wall-clock reading in some zone, as the moment it actually happened. */
function fromZone(parts: number[], timeZone: string): Date {
  const guess = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  // One correction lands it except across a jump, where a second settles it.
  let at = new Date(guess - offsetMinutes(timeZone, new Date(guess)) * 60000);
  at = new Date(guess - offsetMinutes(timeZone, at) * 60000);
  return at;
}

/** `20260916T140000Z`, `20260916T140000` or `20260916`. */
function parseMoment(prop: Property): Moment | null {
  const m = prop.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const nums = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)];
  const dateOnly = m[4] === undefined || prop.params.VALUE === 'DATE';
  if (m[7]) return { at: new Date(Date.UTC(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5])), dateOnly };
  const tzid = prop.params.TZID;
  if (tzid) return { at: fromZone(nums, tzid), dateOnly };
  // No zone at all: the reader's own clock, which is what a floating time means.
  return { at: new Date(nums[0], nums[1] - 1, nums[2], nums[3], nums[4], nums[5]), dateOnly };
}

/** `PT1H30M`, `P2D` — only the parts a meeting ever uses. */
function parseDuration(value: string): number | null {
  const m = value.match(/^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const ms =
    Number(m[2] ?? 0) * 7 * DAY_MS +
    Number(m[3] ?? 0) * DAY_MS +
    Number(m[4] ?? 0) * 3600_000 +
    Number(m[5] ?? 0) * 60_000 +
    Number(m[6] ?? 0) * 1000;
  return m[1] ? -ms : ms;
}

/** Every VEVENT in the feed, still unexpanded. */
function readEvents(text: string): RawEvent[] {
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      current = {
        uid: '',
        summary: '',
        start: null,
        end: null,
        durationMs: null,
        rrule: null,
        exdates: [],
        recurrenceId: null,
        cancelled: false,
      };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.start) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    const prop = parseLine(line);
    if (!prop) continue;
    switch (prop.name) {
      case 'UID':
        current.uid = prop.value;
        break;
      case 'SUMMARY':
        current.summary = unescapeText(prop.value).trim();
        break;
      case 'DTSTART':
        current.start = parseMoment(prop);
        break;
      case 'DTEND':
        current.end = parseMoment(prop);
        break;
      case 'DURATION':
        current.durationMs = parseDuration(prop.value);
        break;
      case 'RRULE':
        current.rrule = prop.value;
        break;
      case 'RECURRENCE-ID':
        current.recurrenceId = parseMoment(prop);
        break;
      case 'EXDATE':
        for (const one of prop.value.split(',')) {
          const at = parseMoment({ ...prop, value: one });
          if (at) current.exdates.push(at.at.getTime());
        }
        break;
      case 'STATUS':
        current.cancelled = prop.value.toUpperCase() === 'CANCELLED';
        break;
    }
  }
  return events;
}

function rruleParts(rule: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rule.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return out;
}

/**
 * `n` months on from `at`, or null when that month has no such day. The 31st
 * simply skips February, which is what a calendar does with it: moving it to
 * the 28th would put a meeting on a day nobody chose.
 */
function addMonths(at: Date, n: number): Date | null {
  const day = at.getDate();
  const next = new Date(at.getTime());
  next.setDate(1);
  next.setMonth(next.getMonth() + n);
  if (day > new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()) return null;
  next.setDate(day);
  return next;
}

/**
 * When a repeating event happens, between `from` and `to`. Only the rules a
 * calendar actually uses: how often, how far apart, which weekdays, and when
 * it stops.
 */
function expand(start: Date, rule: string, from: Date, to: Date): Date[] {
  const parts = rruleParts(rule);
  const freq = (parts.FREQ ?? '').toUpperCase();
  const interval = Math.max(1, Number(parts.INTERVAL ?? 1) || 1);
  const count = parts.COUNT ? Number(parts.COUNT) : null;
  const untilProp = parts.UNTIL ? parseMoment({ name: 'UNTIL', params: {}, value: parts.UNTIL }) : null;
  const until = untilProp ? untilProp.at : null;
  const byDay = (parts.BYDAY ?? '')
    .split(',')
    .map((d) => WEEKDAYS.indexOf(d.replace(/^[-+]?\d+/, '').toUpperCase()))
    .filter((d) => d >= 0);

  const out: Date[] = [];
  let made = 0;

  const take = (at: Date) => {
    if (until && at > until) return false;
    if (count !== null && made >= count) return false;
    made++;
    if (at >= from && at < to) out.push(new Date(at.getTime()));
    return true;
  };

  if (freq === 'WEEKLY' && byDay.length) {
    // Every chosen weekday, in each week the interval lands on.
    const weekStart = new Date(start.getTime());
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    for (let week = 0; week < MAX_OCCURRENCES; week++) {
      const base = new Date(weekStart.getTime());
      base.setDate(base.getDate() + week * interval * 7);
      if (base.getTime() > to.getTime() + 7 * DAY_MS) break;
      let room = true;
      for (const day of [...byDay].sort((a, b) => a - b)) {
        const at = new Date(base.getTime());
        at.setDate(at.getDate() + day);
        if (at < start) continue;
        if (!take(at)) {
          room = false;
          break;
        }
      }
      if (!room) break;
    }
    return out;
  }

  let at = new Date(start.getTime());
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    if (at.getTime() > to.getTime()) break;
    if (!take(at)) break;
    const next = new Date(at.getTime());
    if (freq === 'DAILY') next.setDate(next.getDate() + interval);
    else if (freq === 'WEEKLY') next.setDate(next.getDate() + 7 * interval);
    else if (freq === 'MONTHLY') return [...out, ...expandBy(start, interval, from, to, until, count, made, 'month')];
    else if (freq === 'YEARLY') return [...out, ...expandBy(start, interval, from, to, until, count, made, 'year')];
    else break;
    at = next;
  }
  return out;
}

/**
 * The monthly and yearly walk, which steps by the calendar rather than by days.
 * Each occurrence is counted from the first one, so a clamped month never drags
 * the rest of the series along with it.
 */
function expandBy(
  start: Date,
  interval: number,
  from: Date,
  to: Date,
  until: Date | null,
  count: number | null,
  made0: number,
  unit: 'month' | 'year',
): Date[] {
  const out: Date[] = [];
  const step = unit === 'month' ? interval : 12 * interval;
  let made = made0;
  for (let i = 1; i < MAX_OCCURRENCES; i++) {
    const at = addMonths(start, i * step);
    if (!at) continue;
    if (at.getTime() > to.getTime()) break;
    if (until && at > until) break;
    if (count !== null && made >= count) break;
    made++;
    if (at >= from && at < to) out.push(at);
  }
  return out;
}

/**
 * Every timed occurrence in `[from, to)`, repeats expanded. All-day entries and
 * cancelled ones are left out.
 */
export function icsEventsBetween(text: string, from: Date, to: Date): IcsEvent[] {
  const raw = readEvents(text);

  // An entry that replaces one occurrence stands in its place.
  const overrides = new Set<string>();
  for (const e of raw) {
    if (e.recurrenceId) overrides.add(`${e.uid}|${e.recurrenceId.at.getTime()}`);
  }

  const out: IcsEvent[] = [];
  for (const e of raw) {
    if (e.cancelled || !e.start || e.start.dateOnly) continue;
    const lengthMs =
      e.durationMs !== null && e.durationMs > 0
        ? e.durationMs
        : e.end
          ? e.end.at.getTime() - e.start.at.getTime()
          : 0;
    // A meeting with no length is a marker, not time taken out of the day.
    if (lengthMs <= 0) continue;

    const summary = e.summary || '(No title)';
    const starts = e.rrule && !e.recurrenceId ? expand(e.start.at, e.rrule, from, to) : [e.start.at];
    for (const at of starts) {
      const stamp = at.getTime();
      if (e.exdates.includes(stamp)) continue;
      if (e.rrule && overrides.has(`${e.uid}|${stamp}`)) continue;
      if (at.getTime() >= to.getTime() || at.getTime() + lengthMs <= from.getTime()) continue;
      out.push({ uid: e.uid, summary, start: at, end: new Date(stamp + lengthMs) });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
