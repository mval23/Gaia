import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatRange, snap, summarizeDay } from './time';
import { findFreeSlot, layoutLanes } from './layout';
import { addMonths, monthGrid, weekDates } from './dates';
import { createSeed } from '../data/seed';
import { reducer } from '../store/reducer';
import {
  groupOfTask,
  blocksOn,
  resolveGroupParam,
  categoriesInGroup,
  inDayList,
  compareDayList,
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
