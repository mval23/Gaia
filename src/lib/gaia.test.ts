import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatRange, snap, summarizeDay } from './time';
import { findFreeSlot, layoutLanes } from './layout';
import { addDays, addMonths, dayOfWeek, monthGrid, startOfWeek, weekDates, weekdayOrder } from './dates';
import { DEFAULT_RHYTHM, isOnRhythm, normalizeRhythm, rhythmLabel, weeklyTarget } from './rhythm';
import { createEmpty } from '../data/seed';
import { mentionsBodyOrFood } from './sensitive';
import { isState, migrateState } from '../store/persist';
import type { CheckIn, GaiaState, Rhythm } from '../types';
import { createSeed } from '../data/seed';
import { reducer } from '../store/reducer';
import {
  groupOfTask,
  blocksOn,
  resolveGroupParam,
  categoriesInGroup,
  inDayList,
  compareDayList,
  checkInFor,
  goalActivity,
  goalsByStatus,
  habitsForDate,
  isHabitResting,
  isQuiet,
  lastContactDate,
  partitionDay,
  totalCount,
  weekCount,
} from '../store/selectors';

describe('time', () => {
  it('snaps to 15 minutes', () => {
    expect(snap(637)).toBe(630);
    expect(snap(638)).toBe(645);
    expect(snap(0)).toBe(0);
  });

  it('formats clocks, ranges and durations', () => {
    expect(formatClock(630)).toBe('10:30');
    expect(formatClock(1230, '12h')).toBe('8:30 PM');
    expect(formatClock(0, '12h')).toBe('12:00 AM');
    expect(formatClock(24 * 60)).toBe('24:00');
    expect(formatRange(630, 75)).toBe('10:30 – 11:45');
    expect(formatDuration(75)).toBe('1h 15m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(45)).toBe('45m');
  });

  it('summarizes planned and free time in the waking window', () => {
    expect(summarizeDay([90, 60, 45, 90], 16 * 60)).toEqual({ tasks: 4, plannedMin: 285, freeMin: 675 });
    expect(summarizeDay([1000], 60).freeMin).toBe(0);
  });
});

describe('layout', () => {
  it('places overlapping blocks in lanes', () => {
    const lanes = layoutLanes([
      { id: 'a', startMin: 600, durationMin: 60 },
      { id: 'b', startMin: 630, durationMin: 60 },
      { id: 'c', startMin: 720, durationMin: 30 },
    ]);
    expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get('c')).toEqual({ lane: 0, lanes: 1 });
  });

  it('finds the next free slot', () => {
    const busy = [
      { startMin: 540, durationMin: 60 },
      { startMin: 630, durationMin: 30 },
    ];
    expect(findFreeSlot(busy, 60, 540, 1380)).toBe(660);
    expect(findFreeSlot(busy, 30, 540, 1380)).toBe(600);
    expect(findFreeSlot(busy, 60, 1350, 1380)).toBeNull();
  });
});

describe('dates', () => {
  it('builds Sunday-first weeks and month grids', () => {
    expect(weekDates('2026-09-16')[0]).toBe('2026-09-13');
    const grid = monthGrid('2026-09-13');
    expect(grid.length % 7).toBe(0);
    expect(grid[0].date).toBe('2026-08-30');
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('hierarchy', () => {
  const seed = createSeed('2026-09-14');

  it('derives a task group from its category', () => {
    const task = seed.tasks.find((t) => t.title === 'Prepare presentation')!;
    expect(groupOfTask(seed, task)?.name).toBe('Work');
  });

  it('moving a task to a Personal category moves it to Personal', () => {
    const next = reducer(seed, { type: 'task/update', id: 't-1', patch: { categoryId: 'c-university' } });
    const task = next.tasks.find((t) => t.id === 't-1')!;
    expect(groupOfTask(next, task)?.name).toBe('Personal');
    expect('groupId' in task).toBe(false);
  });

  it('rejects unknown categories', () => {
    const next = reducer(seed, { type: 'task/update', id: 't-1', patch: { categoryId: 'nope' } });
    expect(next.tasks.find((t) => t.id === 't-1')!.categoryId).toBe('c-client-a');
  });

  it('filters scheduled blocks by group', () => {
    const work = resolveGroupParam(seed, 'work');
    const all = blocksOn(seed, '2026-09-14');
    const onlyWork = blocksOn(seed, '2026-09-14', work);
    expect(all.length).toBeGreaterThan(onlyWork.length);
    expect(onlyWork.every(({ task }) => groupOfTask(seed, task)?.id === work)).toBe(true);
  });

  it('moves categories between groups and keeps order contiguous', () => {
    const next = reducer(seed, { type: 'category/move', id: 'c-client-a', groupId: 'g-personal', index: 1 });
    expect(categoriesInGroup(next, 'g-personal').map((c) => c.name)).toEqual([
      'University',
      'Client A',
      'Health',
      'Home',
      'Finance',
    ]);
    expect(categoriesInGroup(next, 'g-work').map((c) => c.order)).toEqual([0, 1, 2]);
    const task = next.tasks.find((t) => t.id === 't-1')!;
    expect(groupOfTask(next, task)?.name).toBe('Personal');
  });

  it('deleting a group re-homes its categories', () => {
    const next = reducer(seed, { type: 'group/delete', id: 'g-other', moveCategoriesTo: 'g-personal' });
    expect(next.groups).toHaveLength(2);
    expect(next.categories.find((c) => c.id === 'c-misc')!.groupId).toBe('g-personal');
  });

  it('builds the day list: unchecked tasks, plus anything on that day’s timeline', () => {
    const day = '2026-09-14';
    const base = seed.tasks[0];
    const open = { ...base, status: 'open' as const, blocks: [] };
    const doneLoose = { ...base, status: 'done' as const, blocks: [] };
    const onDay = { ...base, status: 'open' as const, blocks: [{ id: 'x', date: day, startMin: 600, durationMin: 60 }] };
    const doneOnDay = { ...onDay, status: 'done' as const };
    const otherDay = { ...onDay, blocks: [{ id: 'y', date: '2026-09-15', startMin: 600, durationMin: 60 }] };
    const doneOtherDay = { ...otherDay, status: 'done' as const };
    expect(inDayList(open, day)).toBe(true);
    expect(inDayList(onDay, day)).toBe(true);
    expect(inDayList(doneOnDay, day)).toBe(true);
    expect(inDayList(otherDay, day)).toBe(true);
    expect(inDayList(doneLoose, day)).toBe(false);
    expect(inDayList(doneOtherDay, day)).toBe(false);
    expect([onDay, open].sort((a, b) => compareDayList(a, b, day))[0]).toBe(open);
  });

  it('clamps time blocks into the day', () => {
    const next = reducer(seed, {
      type: 'block/add',
      taskId: 't-2',
      block: { id: 'b-new', date: '2026-09-14', startMin: 23 * 60 + 30, durationMin: 120 },
    });
    expect(next.tasks.find((t) => t.id === 't-2')!.blocks).toEqual([
      { id: 'b-new', date: '2026-09-14', startMin: 22 * 60, durationMin: 120 },
    ]);
  });

  it('lets one task be scheduled many times', () => {
    let next = reducer(seed, { type: 'block/add', taskId: 't-2', block: { id: 'a', date: '2026-09-15', startMin: 600, durationMin: 60 } });
    next = reducer(next, { type: 'block/add', taskId: 't-2', block: { id: 'b', date: '2026-09-14', startMin: 540, durationMin: 30 } });
    next = reducer(next, { type: 'block/add', taskId: 't-2', block: { id: 'c', date: '2026-09-14', startMin: 900, durationMin: 45 } });
    const task = () => next.tasks.find((t) => t.id === 't-2')!;
    // Sorted by date then time; the task still appears once in the day's list.
    expect(task().blocks.map((b) => b.id)).toEqual(['b', 'c', 'a']);
    expect(blocksOn(next, '2026-09-14').filter(({ task: t }) => t.id === 't-2')).toHaveLength(2);

    next = reducer(next, { type: 'block/update', taskId: 't-2', blockId: 'c', schedule: { date: '2026-09-16', startMin: 900, durationMin: 60 } });
    expect(task().blocks.find((b) => b.id === 'c')).toEqual({ id: 'c', date: '2026-09-16', startMin: 900, durationMin: 60 });

    next = reducer(next, { type: 'block/remove', taskId: 't-2', blockId: 'b' });
    expect(task().blocks.map((b) => b.id)).toEqual(['a', 'c']);

    next = reducer(next, { type: 'task/unschedule', id: 't-2', date: '2026-09-15' });
    expect(task().blocks.map((b) => b.id)).toEqual(['c']);
    next = reducer(next, { type: 'task/unschedule', id: 't-2' });
    expect(task().blocks).toEqual([]);
  });
});

describe('rhythm', () => {
  const MWF: Rhythm = { type: 'daysOfWeek', days: [1, 3, 5] };

  it('knows which days a habit belongs to', () => {
    expect(dayOfWeek('2026-09-13')).toBe(0);
    expect(isOnRhythm(MWF, '2026-09-14')).toBe(true); // Monday
    expect(isOnRhythm(MWF, '2026-09-13')).toBe(false); // Sunday
    // A flexible habit belongs on every day; how often it happened is a softer question.
    expect(isOnRhythm({ type: 'timesPerWeek', times: 3 }, '2026-09-13')).toBe(true);
  });

  it('describes a rhythm in plain words', () => {
    expect(rhythmLabel(MWF)).toBe('Mon, Wed, Fri');
    expect(rhythmLabel({ type: 'timesPerWeek', times: 3 })).toBe('about 3 times a week');
    expect(rhythmLabel({ type: 'daysOfWeek', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('every day');
    expect(weeklyTarget(MWF)).toBe(3);
    expect(weeklyTarget({ type: 'timesPerWeek', times: 4 })).toBe(4);
  });

  it('repairs anything unusable that was stored', () => {
    expect(normalizeRhythm({ type: 'daysOfWeek', days: [1, 1, 9, -2, 3] })).toEqual({
      type: 'daysOfWeek',
      days: [1, 3],
    });
    expect(normalizeRhythm({ type: 'daysOfWeek', days: [] })).toEqual(DEFAULT_RHYTHM);
    expect(normalizeRhythm({ type: 'timesPerWeek', times: 99 })).toEqual(DEFAULT_RHYTHM);
    expect(normalizeRhythm('nonsense')).toEqual(DEFAULT_RHYTHM);
  });
});

describe('check-ins', () => {
  const seed = createSeed('2026-09-14');
  const base = reducer(seed, {
    type: 'habit/add',
    id: 'h-test',
    categoryId: 'c-health',
    title: 'Test habit',
    rhythm: { type: 'timesPerWeek', times: 3 },
  });
  const log = (state: GaiaState, date: string, kind: CheckIn['kind'] = 'done') =>
    reducer(state, { type: 'checkin/set', habitId: 'h-test', date, kind });

  it('keeps one entry per day, and the newest wins', () => {
    const once = log(base, '2026-09-14');
    const twice = log(once, '2026-09-14', 'tiny');
    const mine = twice.checkIns.filter((c) => c.habitId === 'h-test');
    expect(mine).toHaveLength(1);
    expect(mine[0].kind).toBe('tiny');
  });

  it('has no value that means "missed": an unlogged day is simply absent', () => {
    const state = log(base, '2026-09-14');
    expect(checkInFor(state, 'h-test', '2026-09-14')).toBe('done');
    expect(checkInFor(state, 'h-test', '2026-09-15')).toBeUndefined();
    const cleared = reducer(state, { type: 'checkin/clear', habitId: 'h-test', date: '2026-09-14' });
    expect(checkInFor(cleared, 'h-test', '2026-09-14')).toBeUndefined();
  });

  it('counts the week without counting rest days', () => {
    let state = log(base, '2026-09-14');
    state = log(state, '2026-09-15', 'tiny');
    state = log(state, '2026-09-16', 'rest');
    expect(weekCount(state, 'h-test', '2026-09-14')).toBe(2);
    expect(totalCount(state, 'h-test')).toBe(2);
    // A rest day is still contact, so it postpones the gentle nudge.
    expect(lastContactDate(state, 'h-test')).toBe('2026-09-16');
  });

  it('keeps last week out of this week', () => {
    const state = log(base, '2026-09-12'); // Saturday, the week before
    expect(weekDates('2026-09-16')[0]).toBe('2026-09-13');
    expect(weekCount(state, 'h-test', '2026-09-16')).toBe(0);
    expect(totalCount(state, 'h-test')).toBe(1); // the total never resets
  });

  it('waits a full fortnight before offering to change a habit', () => {
    const habit = base.habits.find((h) => h.id === 'h-test')!;
    const at = (daysAgo: number) => log(base, addDays('2026-09-14', -daysAgo));
    expect(isQuiet(at(13), habit, '2026-09-14')).toBe(false);
    expect(isQuiet(at(14), habit, '2026-09-14')).toBe(true);
  });

  it('never logs for a habit or a date that does not exist', () => {
    expect(reducer(base, { type: 'checkin/set', habitId: 'nope', date: '2026-09-14', kind: 'done' })).toBe(base);
    expect(reducer(base, { type: 'checkin/set', habitId: 'h-test', date: 'later', kind: 'done' })).toBe(base);
  });
});

describe('goals', () => {
  const seed = createSeed('2026-09-14');

  it('trims a title, and refuses a blank goal without touching anything', () => {
    const added = reducer(seed, { type: 'goal/add', id: 'goal-x', title: '  Sleep better  ', kind: 'ongoing' });
    expect(added.goals.find((g) => g.id === 'goal-x')!.title).toBe('Sleep better');
    expect(reducer(seed, { type: 'goal/add', id: 'goal-y', title: '   ', kind: 'ongoing' })).toBe(seed);
    const dangling = reducer(seed, {
      type: 'goal/add',
      id: 'goal-z',
      title: 'Read more',
      kind: 'finish',
      categoryId: 'c-nope',
    });
    expect(dangling.goals.find((g) => g.id === 'goal-z')!.categoryId).toBeUndefined();
  });

  it('completing a goal keeps every check-in, and archives habits only when asked', () => {
    const history = seed.checkIns.length;
    const done = reducer(seed, {
      type: 'goal/setStatus',
      id: 'goal-rested',
      status: 'completed',
      closingNote: '  the walks helped  ',
    });
    const goal = done.goals.find((g) => g.id === 'goal-rested')!;
    expect(goal.closedAt).toBeTruthy();
    expect(goal.closingNote).toBe('the walks helped');
    expect(done.checkIns).toHaveLength(history);
    expect(done.habits.filter((h) => h.goalId === 'goal-rested').every((h) => h.status === 'active')).toBe(true);

    const archived = reducer(seed, {
      type: 'goal/setStatus',
      id: 'goal-rested',
      status: 'completed',
      archiveHabits: true,
    });
    expect(archived.habits.filter((h) => h.goalId === 'goal-rested').every((h) => h.status === 'archived')).toBe(true);
    expect(archived.habits.find((h) => h.id === 'h-run')!.status).toBe('active');
    expect(archived.checkIns).toHaveLength(history);
  });

  it('pausing a goal writes nothing to its habits, and resuming restores them', () => {
    const paused = reducer(seed, { type: 'goal/setStatus', id: 'goal-rested', status: 'paused' });
    expect(paused.habits).toBe(seed.habits);
    const walk = paused.habits.find((h) => h.id === 'h-walk')!;
    expect(isHabitResting(paused, walk)).toBe(true);
    expect(habitsForDate(paused, '2026-09-14').some((h) => h.id === 'h-walk')).toBe(false);

    const resumed = reducer(paused, { type: 'goal/setStatus', id: 'goal-rested', status: 'active' });
    expect(habitsForDate(resumed, '2026-09-14').some((h) => h.id === 'h-walk')).toBe(true);
    expect(resumed.goals.find((g) => g.id === 'goal-rested')!.closedAt).toBeUndefined();
  });

  it("sends a paused goal's chosen task back to Later", () => {
    const day = '2026-09-14';
    expect(partitionDay(seed, day).today.some((t) => t.id === 't-10')).toBe(true);
    const paused = reducer(seed, { type: 'goal/setStatus', id: 'goal-stats', status: 'paused' });
    const split = partitionDay(paused, day);
    expect(split.today.some((t) => t.id === 't-10')).toBe(false);
    expect(split.later.some((t) => t.id === 't-10')).toBe(true);
  });

  it('deleting a goal unlinks its tasks and habits but deletes neither', () => {
    const next = reducer(seed, { type: 'goal/delete', id: 'goal-rested' });
    expect(next.goals.some((g) => g.id === 'goal-rested')).toBe(false);
    expect(next.tasks).toHaveLength(seed.tasks.length);
    expect(next.habits).toHaveLength(seed.habits.length);
    expect(next.checkIns).toHaveLength(seed.checkIns.length);
    expect(next.tasks.filter((t) => t.goalId === 'goal-rested')).toHaveLength(0);
    expect(next.habits.filter((h) => h.goalId === 'goal-rested')).toHaveLength(0);
  });

  it('sorts goals into active, resting and closed', () => {
    const paused = reducer(seed, { type: 'goal/setStatus', id: 'goal-rested', status: 'paused' });
    const closed = reducer(paused, { type: 'goal/setStatus', id: 'goal-stats', status: 'released' });
    const sorted = goalsByStatus(closed);
    expect(sorted.active).toHaveLength(0);
    expect(sorted.resting.map((g) => g.id)).toEqual(['goal-rested']);
    expect(sorted.closed.map((g) => g.id)).toEqual(['goal-stats']);
  });

  it('describes a goal without scoring it', () => {
    const goal = seed.goals.find((g) => g.id === 'goal-stats')!;
    const activity = goalActivity(seed, goal, '2026-09-14');
    expect(activity.totalSteps).toBe(2);
    expect(activity.steps).toBe(0);
    expect(activity.activeDays).toBeGreaterThan(0);
  });
});

describe('cascades', () => {
  const seed = createSeed('2026-09-14');

  it('deleting a category takes its habits and their history, and spares the goal', () => {
    const gone = seed.habits.filter((h) => h.categoryId === 'c-health').map((h) => h.id);
    expect(gone.length).toBeGreaterThan(0);
    const statsHistory = seed.checkIns.filter((c) => c.habitId === 'h-stats').length;
    const next = reducer(seed, { type: 'category/delete', id: 'c-health' });
    expect(next.habits.some((h) => gone.includes(h.id))).toBe(false);
    expect(next.checkIns.some((c) => gone.includes(c.habitId))).toBe(false);
    expect(next.checkIns.filter((c) => c.habitId === 'h-stats')).toHaveLength(statsHistory);
    const goal = next.goals.find((g) => g.id === 'goal-rested');
    expect(goal).toBeTruthy();
    expect(goal!.categoryId).toBeUndefined();
  });

  it('re-homes habits with their category when a group goes', () => {
    const next = reducer(seed, { type: 'group/delete', id: 'g-personal', moveCategoriesTo: 'g-other' });
    expect(next.habits).toBe(seed.habits);
    expect(next.categories.find((c) => c.id === 'c-health')!.groupId).toBe('g-other');
    expect(habitsForDate(next, '2026-09-14', 'g-other').some((h) => h.id === 'h-walk')).toBe(true);
  });

  it('deleting a habit removes only its own history', () => {
    const others = seed.checkIns.filter((c) => c.habitId !== 'h-walk').length;
    const next = reducer(seed, { type: 'habit/delete', id: 'h-walk' });
    expect(next.habits.some((h) => h.id === 'h-walk')).toBe(false);
    expect(next.checkIns).toHaveLength(others);
  });
});

describe('migration', () => {
  /** A save written before goals, habits or check-ins existed. */
  const legacy = (): GaiaState => {
    const seed = createSeed('2026-09-14');
    return {
      groups: seed.groups,
      categories: seed.categories,
      tasks: seed.tasks,
      settings: { timeFormat: '12h', dayStartHour: 6, dayEndHour: 22 },
    } as unknown as GaiaState;
  };

  it('still recognises a save written before goals existed', () => {
    // If this fails, every existing planner is silently replaced by sample data.
    expect(isState(legacy())).toBe(true);
  });

  it('fills in the new collections and keeps what was saved', () => {
    const before = legacy();
    const after = migrateState(before);
    expect(after.goals).toEqual([]);
    expect(after.habits).toEqual([]);
    expect(after.checkIns).toEqual([]);
    expect(after.reflections).toEqual([]);
    expect(after.tasks).toHaveLength(before.tasks.length);
    expect(after.categories).toBe(before.categories);
    expect(after.settings.timeFormat).toBe('12h');
    expect(after.settings.dayStartHour).toBe(6);
    // New settings arrive with their defaults.
    expect(after.settings.hideNumbers).toBe(false);
    expect(after.settings.reflectionWeekday).toBe(0);
  });

  it('repairs anything unusable rather than discarding the save', () => {
    const seed = createSeed('2026-09-14');
    const raw = {
      ...legacy(),
      tasks: [
        { ...seed.tasks[0], status: 'nonsense' },
        { ...seed.tasks[1], id: 't-lg', status: 'let-go' },
      ],
      goals: [{ id: 'goal-bad', title: 'Hmm', kind: '??', status: '??', categoryId: 'c-nope', createdAt: 'x' }],
      habits: [
        {
          id: 'h-bad',
          title: '  Wobbly  ',
          categoryId: 'c-health',
          rhythm: { type: 'weird' },
          status: '??',
          preferredStartMin: 99999,
          createdAt: 'x',
        },
      ],
      checkIns: [
        { habitId: 'h-bad', date: '2026-09-14', kind: 'done' },
        { habitId: 'h-bad', date: 'someday', kind: 'done' },
        { habitId: 'h-gone', date: '2026-09-14', kind: 'done' },
        { habitId: 'h-bad', date: '2026-09-15', kind: 'missed' },
      ],
    } as unknown as GaiaState;

    const after = migrateState(raw);
    expect(after.tasks[0].status).toBe('open');
    expect(after.tasks[1].status).toBe('let-go');

    const goal = after.goals[0];
    expect(goal.kind).toBe('ongoing');
    expect(goal.status).toBe('active');
    expect(goal.categoryId).toBeUndefined();

    const habit = after.habits[0];
    expect(habit.title).toBe('Wobbly');
    expect(habit.rhythm).toEqual(DEFAULT_RHYTHM);
    expect(habit.status).toBe('active');
    expect(habit.preferredStartMin).toBe(1439);

    // Kept: the one valid entry. Dropped: bad date, unknown habit, and any
    // stored kind that does not exist — there is no "missed".
    expect(after.checkIns).toEqual([{ habitId: 'h-bad', date: '2026-09-14', kind: 'done' }]);
  });

  it('gives "delete everything" a state that will load again', () => {
    expect(isState(createEmpty())).toBe(true);
    expect(createEmpty().goals).toEqual([]);
  });
});

describe('the day', () => {
  const seed = createSeed('2026-09-14');
  const day = '2026-09-14';

  it('puts only what was chosen or scheduled into Today, and lets the rest wait', () => {
    const { today, later } = partitionDay(seed, day);
    // Open, but not chosen and not scheduled: it waits under Later.
    expect(today.some((t) => t.id === 't-2')).toBe(false);
    expect(later.some((t) => t.id === 't-2')).toBe(true);
    // Chosen for today.
    expect(today.some((t) => t.id === 't-5')).toBe(true);
    // Finished on another day: in neither list.
    expect(today.some((t) => t.id === 't-8')).toBe(false);
    expect(later.some((t) => t.id === 't-8')).toBe(false);
  });

  it('keeps a task with time on the timeline in Today even when it was never chosen', () => {
    const state = reducer(seed, { type: 'task/plan', id: 't-7', date: undefined });
    expect(state.tasks.find((t) => t.id === 't-7')!.plannedFor).toBeUndefined();
    expect(partitionDay(state, day).today.some((t) => t.id === 't-7')).toBe(true);
  });

  it('leaves a let-go task out of both lists, with its history intact', () => {
    const state = reducer(seed, { type: 'task/update', id: 't-2', patch: { status: 'let-go' } });
    const { today, later } = partitionDay(state, day);
    expect(today.some((t) => t.id === 't-2')).toBe(false);
    expect(later.some((t) => t.id === 't-2')).toBe(false);
    expect(state.tasks.some((t) => t.id === 't-2')).toBe(true);
  });

  it('brings a let-go task back as open, never as done', () => {
    const gone = reducer(seed, { type: 'task/update', id: 't-2', patch: { status: 'let-go' } });
    const back = reducer(gone, { type: 'task/toggle', id: 't-2' });
    expect(back.tasks.find((t) => t.id === 't-2')!.status).toBe('open');
    expect(back.tasks.find((t) => t.id === 't-2')!.completedAt).toBeUndefined();
  });

  it('counts a move between days, but not a step back to Later', () => {
    const chosen = reducer(seed, { type: 'task/plan', id: 't-2', date: day });
    expect(chosen.tasks.find((t) => t.id === 't-2')!.plannedMoves).toBeUndefined();
    const moved = reducer(chosen, { type: 'task/plan', id: 't-2', date: '2026-09-15' });
    expect(moved.tasks.find((t) => t.id === 't-2')!.plannedMoves).toBe(1);
    const back = reducer(moved, { type: 'task/plan', id: 't-2', date: undefined });
    expect(back.tasks.find((t) => t.id === 't-2')!.plannedMoves).toBe(1);
    expect(back.tasks.find((t) => t.id === 't-2')!.plannedFor).toBeUndefined();
  });

  it('keeps a reflection to one per week', () => {
    const weekStart = startOfWeek(day);
    const saved = reducer(seed, {
      type: 'reflection/save',
      id: 'r-1',
      weekStart,
      patch: { wentWell: '  the walks  ' },
    });
    expect(saved.reflections).toHaveLength(1);
    expect(saved.reflections[0].wentWell).toBe('the walks');
    const again = reducer(saved, { type: 'reflection/save', id: 'r-2', weekStart, patch: { wasHard: 'evenings' } });
    expect(again.reflections).toHaveLength(1);
    expect(again.reflections[0].id).toBe('r-1');
    expect(again.reflections[0].wentWell).toBe('the walks');
    // Emptying it leaves no trace: skipping a week is not recorded.
    const cleared = reducer(again, {
      type: 'reflection/save',
      id: 'r-3',
      weekStart,
      patch: { wentWell: '', wasHard: '' },
    });
    expect(cleared.reflections).toHaveLength(0);
  });
});

describe('letting go', () => {
  const seed = createSeed('2026-09-14');

  it('takes a let-go task out of the day list, even when it still has time on it', () => {
    const day = '2026-09-14';
    const scheduled = seed.tasks.find((t) => t.id === 't-7')!;
    expect(inDayList(scheduled, day)).toBe(true);
    const state = reducer(seed, { type: 'task/update', id: 't-7', patch: { status: 'let-go' } });
    expect(inDayList(state.tasks.find((t) => t.id === 't-7')!, day)).toBe(false);
    // The history, including its sessions, is still there.
    expect(state.tasks.find((t) => t.id === 't-7')!.blocks.length).toBeGreaterThan(0);
  });
});

describe('sensitive topics', () => {
  it('notices goals about food, weight or the body, and leaves everything else alone', () => {
    expect(mentionsBodyOrFood('Lose weight before June')).toBe(true);
    expect(mentionsBodyOrFood('Bajar de peso')).toBe(true);
    expect(mentionsBodyOrFood('Count calories every day')).toBe(true);
    // Ordinary goals must not trip it: a false alarm here costs trust.
    expect(mentionsBodyOrFood('Cook at home more often')).toBe(false);
    expect(mentionsBodyOrFood('Run a 5K comfortably')).toBe(false);
    expect(mentionsBodyOrFood('Feel more rested')).toBe(false);
    expect(mentionsBodyOrFood('Pass Statistics this semester')).toBe(false);
  });
});

describe('week start', () => {
  it('moves the first day of the week without touching anything else', () => {
    // 2026-09-13 is a Sunday, 2026-09-14 the Monday after it.
    expect(startOfWeek('2026-09-15')).toBe('2026-09-13');
    expect(startOfWeek('2026-09-15', 1)).toBe('2026-09-14');
    expect(weekDates('2026-09-15', 1)[0]).toBe('2026-09-14');
    expect(weekDates('2026-09-15', 1)[6]).toBe('2026-09-20');
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    // September 2026 opens on a Tuesday, so a Monday grid leads with 31 August.
    expect(monthGrid('2026-09-15', 1)[0].date).toBe('2026-08-31');
  });

  it('decides which week a check-in counts towards', () => {
    const seed = createSeed('2026-09-14');
    const withHabit = reducer(seed, {
      type: 'habit/add',
      id: 'h-week',
      categoryId: 'c-health',
      title: 'Week test',
      rhythm: { type: 'timesPerWeek', times: 3 },
    });
    // Logged on Sunday the 13th.
    const logged = reducer(withHabit, { type: 'checkin/set', habitId: 'h-week', date: '2026-09-13', kind: 'done' });
    expect(weekCount(logged, 'h-week', '2026-09-15')).toBe(1);

    const mondayStart = reducer(logged, { type: 'settings/update', patch: { weekStart: 1 } });
    // With weeks starting Monday, that Sunday belongs to the week before.
    expect(weekCount(mondayStart, 'h-week', '2026-09-15')).toBe(0);
    expect(weekCount(mondayStart, 'h-week', '2026-09-13')).toBe(1);
    // The lifetime total never depends on where the week begins.
    expect(totalCount(mondayStart, 'h-week')).toBe(1);
  });
});
