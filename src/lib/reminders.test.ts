import { describe, expect, it } from 'vitest';
import type { GaiaState, Habit, Task } from '../types';
import { createEmpty } from '../data/seed';
import { DEFAULT_REMINDERS, dueNudges, localClock, nudgesOn } from './reminders';
import { NUDGE } from './copy';

// 27 Sep 2026 is a Sunday, the default reflection day. 30 Sep is the month's last day.
const SUNDAY = '2026-09-27';
const WEDNESDAY = '2026-09-23';
const MONTH_END = '2026-09-30';

const task = (patch: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Draft the intro',
  status: 'open',
  notes: '',
  blocks: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  ...patch,
});

const habit = (patch: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  title: 'Move my body',
  categoryId: 'c-everyday',
  rhythm: { type: 'timesPerWeek', times: 3 },
  status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...patch,
});

function planner(patch: Partial<GaiaState> = {}): GaiaState {
  const empty = createEmpty();
  return { ...empty, ...patch, settings: { ...empty.settings, reminders: { ...DEFAULT_REMINDERS }, ...patch.settings } };
}

const keys = (state: GaiaState, date: string) => nudgesOn(state, date).map((n) => n.key.split(':')[0]);

describe('reminders', () => {
  it('says nothing until notifications have been turned on', () => {
    const state = { ...planner({ tasks: [task({ blocks: [{ id: 'b1', date: WEDNESDAY, startMin: 600, durationMin: 45 }] })] }) };
    state.settings = { ...state.settings, reminders: undefined };
    expect(nudgesOn(state, WEDNESDAY)).toEqual([]);
  });

  it('nudges a few minutes before a time block, and re-arms when the block moves', () => {
    const block = { id: 'b1', date: WEDNESDAY, startMin: 14 * 60, durationMin: 45 };
    const state = planner({ tasks: [task({ blocks: [block] })] });
    const [nudge] = nudgesOn(state, WEDNESDAY);
    expect(nudge.atMin).toBe(14 * 60 - 5);
    expect(nudge.title).toBe('Draft the intro');
    expect(nudge.body).toBe(`${NUDGE.blockSoon} 14:00 · 45m`);

    const moved = planner({ tasks: [task({ blocks: [{ ...block, startMin: 15 * 60 }] })] });
    expect(nudgesOn(moved, WEDNESDAY)[0].key).not.toBe(nudge.key);
  });

  it('skips blocks of tasks that are done or let go', () => {
    const blocks = [{ id: 'b1', date: WEDNESDAY, startMin: 600, durationMin: 30 }];
    expect(nudgesOn(planner({ tasks: [task({ status: 'done', blocks })] }), WEDNESDAY)).toEqual([]);
    expect(nudgesOn(planner({ tasks: [task({ status: 'let-go', blocks })] }), WEDNESDAY)).toEqual([]);
  });

  it('names the one that matters in the morning, only on a day that has one', () => {
    expect(keys(planner({ tasks: [task()] }), WEDNESDAY)).toEqual([]);
    const [nudge] = nudgesOn(planner({ tasks: [task({ essentialFor: WEDNESDAY })] }), WEDNESDAY);
    expect(nudge).toMatchObject({ title: NUDGE.morningTitle, body: 'Draft the intro', atMin: DEFAULT_REMINDERS.morningMin });
  });

  it('invites a look back on the reflection day and the month end, until it is written', () => {
    expect(nudgesOn(planner(), SUNDAY)[0].title).toBe(NUDGE.weekTitle);
    const month = nudgesOn(planner(), MONTH_END)[0];
    expect(month.title).toBe(NUDGE.monthTitle);
    expect(month.url).toContain('period=month');
    expect(keys(planner(), WEDNESDAY)).toEqual([]);

    const written = planner({
      reflections: [{ id: 'r1', weekStart: SUNDAY, period: 'week', createdAt: '2026-09-27T20:00:00.000Z' }],
    });
    expect(keys(written, SUNDAY)).toEqual([]);
  });

  it('asks about habits in the evening only when nothing is logged, and never lists them', () => {
    const habits = [habit(), habit({ id: 'h2', title: 'Evening shutdown' })];
    const [nudge] = nudgesOn(planner({ habits }), WEDNESDAY);
    expect(nudge).toMatchObject({ title: NUDGE.eveningTitle, body: NUDGE.eveningBody });
    expect(`${nudge.title} ${nudge.body}`).not.toMatch(/Move my body|Evening shutdown|\d/);

    const logged = planner({ habits, checkIns: [{ habitId: 'h1', date: WEDNESDAY, kind: 'tiny' }] });
    expect(keys(logged, WEDNESDAY)).toEqual([]);
  });

  it('leaves a Gentle day and a day with no habits on it alone in the evening', () => {
    const gentle = planner({ habits: [habit()], lights: [{ date: WEDNESDAY, shape: 'gentle' }] });
    expect(keys(gentle, WEDNESDAY)).toEqual([]);
    const notToday = planner({ habits: [habit({ rhythm: { type: 'daysOfWeek', days: [1] } })] });
    expect(keys(notToday, WEDNESDAY)).toEqual([]);
  });

  it('never uses the words Gaia keeps out', () => {
    const state = planner({
      habits: [habit()],
      tasks: [task({ essentialFor: MONTH_END, blocks: [{ id: 'b1', date: MONTH_END, startMin: 0, durationMin: 30 }] })],
    });
    const text = nudgesOn(state, MONTH_END)
      .map((n) => `${n.title} ${n.body}`)
      .join(' ');
    expect(text).not.toMatch(/missed|overdue|failed|streak/i);
  });

  it('sends what fell in the last few minutes, including just before midnight', () => {
    const state = planner({ habits: [habit()] });
    state.settings.reminders = { ...DEFAULT_REMINDERS, eveningMin: 23 * 60 + 55 };
    expect(dueNudges(state, WEDNESDAY, 23 * 60 + 50)).toEqual([]);
    expect(dueNudges(state, WEDNESDAY, 23 * 60 + 56)).toHaveLength(1);
    expect(dueNudges(state, '2026-09-24', 3)[0].key).toBe(`evening:${WEDNESDAY}`);
    expect(dueNudges(state, '2026-09-24', 30)).toEqual([]);
  });

  it("reads the clock in the phone's own time zone", () => {
    const now = new Date('2026-09-28T02:30:00Z');
    expect(localClock('America/Bogota', now)).toEqual({ date: SUNDAY, min: 21 * 60 + 30 });
    expect(localClock('UTC', now)).toEqual({ date: '2026-09-28', min: 150 });
  });
});
