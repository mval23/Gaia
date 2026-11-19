import { describe, expect, it } from 'vitest';
import type { Task, TimeBlock } from '../../types';
import { toGoogleEvent } from './calendar';
import { blockSignature } from '../../lib/calendar';

const task = (patch: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Draft the intro',
  status: 'open',
  notes: '',
  blocks: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

const block: TimeBlock = { id: 'b1', date: '2026-11-10', startMin: 14 * 60, durationMin: 45 };

describe('a time block as a Google event', () => {
  it('carries the title and the exact span', () => {
    const event = toGoogleEvent(task(), block);
    expect(event.summary).toBe('Draft the intro');
    // Written in UTC, so one rule covers every reader's clock.
    expect(new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()).toBe(45 * 60_000);
    expect(event.start.timeZone).toBe('UTC');
  });

  it('marks a finished task without changing its time', () => {
    const event = toGoogleEvent(task({ status: 'done' }), block);
    expect(event.summary).toBe('✓ Draft the intro');
    expect(event.start.dateTime).toBe(toGoogleEvent(task(), block).start.dateTime);
  });

  it('leaves Google’s own reminders off, since Gaia has its own', () => {
    expect(toGoogleEvent(task(), block).reminders).toEqual({ useDefault: false });
  });

  it('only asks to be rewritten when something a reader would see has changed', () => {
    const same = blockSignature(task(), block);
    expect(blockSignature(task(), { ...block })).toBe(same);
    expect(blockSignature(task({ title: 'Draft the outro' }), block)).not.toBe(same);
    expect(blockSignature(task({ status: 'done' }), block)).not.toBe(same);
    expect(blockSignature(task(), { ...block, startMin: 15 * 60 })).not.toBe(same);
    expect(blockSignature(task(), { ...block, durationMin: 60 })).not.toBe(same);
    expect(blockSignature(task(), { ...block, date: '2026-11-11' })).not.toBe(same);
    // Notes stay in Gaia, so changing them sends nothing.
    expect(blockSignature(task({ notes: 'a new thought' }), block)).toBe(same);
  });
});
