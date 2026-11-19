import { describe, expect, it } from 'vitest';
import { icsEventsBetween } from './ics';

/** A feed, written the way a calendar really sends one: CRLF between lines. */
const feed = (...lines: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//EN', ...lines, 'END:VCALENDAR'].join('\r\n');

const event = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];

const WEEK_FROM = new Date(Date.UTC(2026, 8, 14));
const WEEK_TO = new Date(Date.UTC(2026, 8, 21));

const titles = (text: string, from = WEEK_FROM, to = WEEK_TO) =>
  icsEventsBetween(text, from, to).map((e) => e.summary);

describe('reading an iCalendar feed', () => {
  it('reads a plain meeting, in UTC', () => {
    const text = feed(...event('UID:a', 'SUMMARY:Standup', 'DTSTART:20260916T140000Z', 'DTEND:20260916T143000Z'));
    const [one] = icsEventsBetween(text, WEEK_FROM, WEEK_TO);
    expect(one.summary).toBe('Standup');
    expect(one.start.toISOString()).toBe('2026-09-16T14:00:00.000Z');
    expect(one.end.toISOString()).toBe('2026-09-16T14:30:00.000Z');
  });

  it('puts a time written in another zone at the right moment', () => {
    // Bogotá is UTC-5 all year, so 09:00 there is 14:00 UTC.
    const text = feed(
      ...event('UID:b', 'SUMMARY:Call', 'DTSTART;TZID=America/Bogota:20260916T090000', 'DTEND;TZID=America/Bogota:20260916T100000'),
    );
    const [one] = icsEventsBetween(text, WEEK_FROM, WEEK_TO);
    expect(one.start.toISOString()).toBe('2026-09-16T14:00:00.000Z');
    expect(one.end.toISOString()).toBe('2026-09-16T15:00:00.000Z');
  });

  it('puts folded lines back together and unescapes the text', () => {
    const text = feed(
      'BEGIN:VEVENT',
      'UID:c',
      'SUMMARY:A rather long title that the calendar wrapped ',
      ' across two lines\\, with a comma',
      'DTSTART:20260916T140000Z',
      'DTEND:20260916T150000Z',
      'END:VEVENT',
    );
    expect(titles(text)).toEqual(['A rather long title that the calendar wrapped across two lines, with a comma']);
  });

  it('takes a length from DURATION when there is no end', () => {
    const text = feed(...event('UID:d', 'SUMMARY:Focus', 'DTSTART:20260916T140000Z', 'DURATION:PT1H30M'));
    const [one] = icsEventsBetween(text, WEEK_FROM, WEEK_TO);
    expect(one.end.getTime() - one.start.getTime()).toBe(90 * 60_000);
  });

  it('leaves out all-day entries, cancelled ones and anything with no length', () => {
    const text = feed(
      ...event('UID:e', 'SUMMARY:Birthday', 'DTSTART;VALUE=DATE:20260916', 'DTEND;VALUE=DATE:20260917'),
      ...event('UID:f', 'SUMMARY:Called off', 'DTSTART:20260916T140000Z', 'DTEND:20260916T150000Z', 'STATUS:CANCELLED'),
      ...event('UID:g', 'SUMMARY:A marker', 'DTSTART:20260916T140000Z', 'DTEND:20260916T140000Z'),
      ...event('UID:h', 'SUMMARY:Real', 'DTSTART:20260916T160000Z', 'DTEND:20260916T170000Z'),
    );
    expect(titles(text)).toEqual(['Real']);
  });

  it('only returns what overlaps the days asked for', () => {
    const text = feed(
      ...event('UID:i', 'SUMMARY:Before', 'DTSTART:20260901T140000Z', 'DTEND:20260901T150000Z'),
      ...event('UID:j', 'SUMMARY:During', 'DTSTART:20260916T140000Z', 'DTEND:20260916T150000Z'),
      ...event('UID:k', 'SUMMARY:After', 'DTSTART:20261001T140000Z', 'DTEND:20261001T150000Z'),
    );
    expect(titles(text)).toEqual(['During']);
  });

  it('repeats a daily event, and stops where COUNT says', () => {
    const text = feed(
      ...event('UID:l', 'SUMMARY:Daily', 'DTSTART:20260914T140000Z', 'DTEND:20260914T143000Z', 'RRULE:FREQ=DAILY;COUNT=3'),
    );
    const days = icsEventsBetween(text, WEEK_FROM, WEEK_TO).map((e) => e.start.toISOString().slice(0, 10));
    expect(days).toEqual(['2026-09-14', '2026-09-15', '2026-09-16']);
  });

  it('repeats on chosen weekdays, and stops at UNTIL', () => {
    // 14 Sep 2026 is a Monday.
    const text = feed(
      ...event(
        'UID:m',
        'SUMMARY:Mon and Wed',
        'DTSTART:20260914T140000Z',
        'DTEND:20260914T150000Z',
        'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260916T235959Z',
      ),
    );
    const days = icsEventsBetween(text, WEEK_FROM, WEEK_TO).map((e) => e.start.toISOString().slice(0, 10));
    expect(days).toEqual(['2026-09-14', '2026-09-16']);
  });

  it('honours an interval between weeks', () => {
    const text = feed(
      ...event(
        'UID:n',
        'SUMMARY:Fortnightly',
        'DTSTART:20260902T140000Z',
        'DTEND:20260902T150000Z',
        'RRULE:FREQ=WEEKLY;INTERVAL=2',
      ),
    );
    const days = icsEventsBetween(text, new Date(Date.UTC(2026, 8, 1)), new Date(Date.UTC(2026, 9, 1))).map((e) =>
      e.start.toISOString().slice(0, 10),
    );
    expect(days).toEqual(['2026-09-02', '2026-09-16', '2026-09-30']);
  });

  it('repeats monthly on the same day, skipping a month that hasn’t got one', () => {
    const text = feed(
      ...event('UID:o', 'SUMMARY:Month end', 'DTSTART:20260131T140000Z', 'DTEND:20260131T150000Z', 'RRULE:FREQ=MONTHLY'),
    );
    const days = icsEventsBetween(text, new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 4, 1))).map((e) =>
      e.start.toISOString().slice(0, 10),
    );
    // February has no 31st, and the ones after it stay on the 31st all the same.
    expect(days).toEqual(['2026-01-31', '2026-03-31']);
  });

  it('repeats every month when the day exists in all of them', () => {
    const text = feed(
      ...event('UID:o2', 'SUMMARY:Rent', 'DTSTART:20260115T140000Z', 'DTEND:20260115T150000Z', 'RRULE:FREQ=MONTHLY'),
    );
    const days = icsEventsBetween(text, new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2026, 3, 1))).map((e) =>
      e.start.toISOString().slice(0, 10),
    );
    expect(days).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('skips an occurrence the calendar took out', () => {
    const text = feed(
      ...event(
        'UID:p',
        'SUMMARY:Daily',
        'DTSTART:20260914T140000Z',
        'DTEND:20260914T143000Z',
        'RRULE:FREQ=DAILY',
        'EXDATE:20260915T140000Z',
      ),
    );
    const days = icsEventsBetween(text, WEEK_FROM, new Date(Date.UTC(2026, 8, 17))).map((e) =>
      e.start.toISOString().slice(0, 10),
    );
    expect(days).toEqual(['2026-09-14', '2026-09-16']);
  });

  it('lets a moved occurrence stand in place of the original', () => {
    const text = feed(
      ...event('UID:q', 'SUMMARY:Weekly sync', 'DTSTART:20260914T140000Z', 'DTEND:20260914T143000Z', 'RRULE:FREQ=DAILY'),
      ...event(
        'UID:q',
        'SUMMARY:Weekly sync (moved)',
        'RECURRENCE-ID:20260915T140000Z',
        'DTSTART:20260915T170000Z',
        'DTEND:20260915T173000Z',
      ),
    );
    const got = icsEventsBetween(text, WEEK_FROM, new Date(Date.UTC(2026, 8, 16))).map(
      (e) => `${e.summary} ${e.start.toISOString().slice(11, 16)}`,
    );
    expect(got).toEqual(['Weekly sync 14:00', 'Weekly sync (moved) 17:00']);
  });

  it('gives an untitled event a name rather than a blank', () => {
    const text = feed(...event('UID:r', 'DTSTART:20260916T140000Z', 'DTEND:20260916T150000Z'));
    expect(titles(text)).toEqual(['(No title)']);
  });

  it('returns nothing for something that isn’t a calendar, rather than throwing', () => {
    expect(icsEventsBetween('<html>not a calendar</html>', WEEK_FROM, WEEK_TO)).toEqual([]);
    expect(icsEventsBetween('', WEEK_FROM, WEEK_TO)).toEqual([]);
  });
});
