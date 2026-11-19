import { describe, expect, it } from 'vitest';
import type { GaiaState, Task } from '../types';
import { createEmpty } from '../data/seed';
import { DEFAULT_REMINDERS } from './reminders';
import { DEVICE_WINDOW_MIN, dueOnDevice, pruneSent } from './deviceNudges';

const WEDNESDAY = '2026-11-18';

const task = (patch: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Draft the intro',
  status: 'open',
  notes: '',
  blocks: [{ id: 'b1', date: WEDNESDAY, startMin: 14 * 60, durationMin: 45 }],
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

function planner(): GaiaState {
  const empty = createEmpty();
  return {
    ...empty,
    tasks: [task()],
    settings: { ...empty.settings, reminders: { ...DEFAULT_REMINDERS } },
  };
}

describe('what this computer says, and when', () => {
  it('says a block’s heads-up at its minute, and its start at the start', () => {
    const state = planner();
    const lead = DEFAULT_REMINDERS.blockLeadMin;
    expect(dueOnDevice(state, WEDNESDAY, 14 * 60 - lead, {}).map((n) => n.body)).toHaveLength(1);
    expect(dueOnDevice(state, WEDNESDAY, 14 * 60, {}).map((n) => n.key)).toEqual([`block:b1:${WEDNESDAY}:840:start`]);
  });

  it('stays quiet when nothing is due', () => {
    expect(dueOnDevice(planner(), WEDNESDAY, 9 * 60, {})).toEqual([]);
  });

  it('says a thing once, however often it looks at the clock', () => {
    const state = planner();
    const at = 14 * 60;
    const [first] = dueOnDevice(state, WEDNESDAY, at, {});
    expect(first).toBeTruthy();
    const sent = { [first.key]: Date.now() };
    expect(dueOnDevice(state, WEDNESDAY, at, sent)).toEqual([]);
    expect(dueOnDevice(state, WEDNESDAY, at + 1, sent)).toEqual([]);
  });

  it('lets a moment pass rather than saying it late', () => {
    const state = planner();
    const at = 14 * 60;
    // Just inside the window, then well outside it.
    expect(dueOnDevice(state, WEDNESDAY, at + DEVICE_WINDOW_MIN - 1, {})).toHaveLength(1);
    expect(dueOnDevice(state, WEDNESDAY, at + DEVICE_WINDOW_MIN + 1, {})).toEqual([]);
  });

  it('says nothing at all until notifications have been set up', () => {
    const state = planner();
    state.settings = { ...state.settings, reminders: undefined };
    expect(dueOnDevice(state, WEDNESDAY, 14 * 60, {})).toEqual([]);
  });

  it('forgets what it said once it could never come round again', () => {
    const now = Date.parse('2026-11-18T12:00:00.000Z');
    const sent = {
      recent: now - 60 * 60 * 1000,
      ancient: now - 5 * 24 * 60 * 60 * 1000,
    };
    expect(pruneSent(sent, now)).toEqual({ recent: sent.recent });
  });
});
