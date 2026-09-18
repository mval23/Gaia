import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import { blockSignature, eventSegments, parseGraphUTC, rangeOf, toGraphEvent, type GraphEvent } from './events';

// Local times are built with the Date constructor so the tests pass in any time zone.
const utc = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString().replace('Z', '0000');

const event = (start: string, end: string, extra: Partial<GraphEvent> = {}): GraphEvent => ({
  id: 'e1',
  subject: 'Standup',
  start: { dateTime: start },
  end: { dateTime: end },
  ...extra,
});

const task: Task = {
  id: 't1',
  title: 'Write report',
  categoryId: 'c1',
  status: 'open',
  priority: 'medium',
  notes: 'private',
  blocks: [],
  createdAt: '2026-09-01T00:00:00Z',
};

describe('outlook events', () => {
  it('reads Graph UTC times', () => {
    expect(parseGraphUTC('2026-09-16T14:00:00.0000000').toISOString()).toBe('2026-09-16T14:00:00.000Z');
  });

  it('places an event on its local day', () => {
    const [seg] = eventSegments(event(utc(2026, 9, 16, 9, 30), utc(2026, 9, 16, 10)), 'cal', 'g');
    expect(seg).toMatchObject({ date: '2026-09-16', startMin: 570, durationMin: 30, groupId: 'g', subject: 'Standup' });
  });

  it('splits an event that crosses midnight', () => {
    const segs = eventSegments(event(utc(2026, 9, 16, 23), utc(2026, 9, 17, 1)), 'cal', 'g');
    expect(segs.map((s) => [s.date, s.startMin, s.durationMin])).toEqual([
      ['2026-09-16', 1380, 60],
      ['2026-09-17', 0, 60],
    ]);
  });

  it('leaves out all-day, cancelled and empty events', () => {
    const s = utc(2026, 9, 16, 9);
    const e = utc(2026, 9, 16, 10);
    expect(eventSegments(event(s, e, { isAllDay: true }), 'cal', 'g')).toEqual([]);
    expect(eventSegments(event(s, e, { isCancelled: true }), 'cal', 'g')).toEqual([]);
    expect(eventSegments(event(s, s), 'cal', 'g')).toEqual([]);
  });

  it('turns a block into an event without the notes', () => {
    const out = toGraphEvent(task, { date: '2026-09-16', startMin: 540, durationMin: 90 });
    expect(out.subject).toBe('Write report');
    expect(parseGraphUTC(out.start.dateTime).getTime()).toBe(new Date(2026, 8, 16, 9).getTime());
    expect(parseGraphUTC(out.end.dateTime).getTime()).toBe(new Date(2026, 8, 16, 10, 30).getTime());
    expect(JSON.stringify(out)).not.toContain('private');
    expect(toGraphEvent({ ...task, status: 'done' }, { date: '2026-09-16', startMin: 0, durationMin: 15 }).subject).toBe(
      '✓ Write report',
    );
  });

  it('changes the signature only when the Outlook copy would change', () => {
    const s = { date: '2026-09-16', startMin: 540, durationMin: 60 };
    expect(blockSignature(task, s)).toBe(blockSignature({ ...task, notes: 'other' }, s));
    expect(blockSignature(task, s)).not.toBe(blockSignature(task, { ...s, startMin: 555 }));
    expect(blockSignature(task, s)).not.toBe(blockSignature({ ...task, status: 'done' }, s));
  });

  it('spans the requested days', () => {
    expect(rangeOf(['2026-09-18', '2026-09-16'])).toEqual({ from: '2026-09-16', to: '2026-09-19' });
  });
});
