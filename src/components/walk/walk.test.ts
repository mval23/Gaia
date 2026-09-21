import { describe, expect, it } from 'vitest';
import { WALK_STEPS, anchorFor, isLastStep, nextIndex, stepAt } from './walkSteps';
import { hasSample, withoutSample } from '../../data/sample';
import { createEmpty, createSeed } from '../../data/seed';
import type { GaiaState, Task } from '../../types';

/** The words Gaia never uses, from the conventions in the README. */
const UNKIND = ['missed', 'overdue', 'failed', 'fail', 'streak', 'behind', 'catch up'];

/** As if you had made one of each along the way. */
const MADE = { group: 'g-mine', category: 'c-mine', task: 't-mine' };

const stepNamed = (id: string) => WALK_STEPS.find((s) => s.id === id)!;

describe('the walk', () => {
  it('stays a walk, not a course', () => {
    expect(WALK_STEPS.length).toBeLessThanOrEqual(13);
  });

  it('ends rather than looping', () => {
    expect(nextIndex(WALK_STEPS.length - 1)).toBeNull();
    expect(isLastStep(WALK_STEPS.length - 1)).toBe(true);
    expect(isLastStep(0)).toBe(false);
  });

  it('walks forward one stop at a time', () => {
    expect(nextIndex(0)).toBe(1);
    expect(stepAt(0)).toBe(WALK_STEPS[0]);
    expect(stepAt(null)).toBeNull();
    expect(stepAt(WALK_STEPS.length)).toBeNull();
  });

  it('gives every stop something real to point at, whether or not you have made anything', () => {
    for (const step of WALK_STEPS) {
      for (const made of [{}, MADE]) {
        expect(anchorFor(step, made), step.id).toMatch(/^[a-z][a-z-]*$/);
      }
      expect(step.path, step.id).toMatch(/^\//);
      expect(step.title.length, step.id).toBeGreaterThan(0);
      expect(step.body.length, step.id).toBeGreaterThan(0);
    }
  });

  it('has one stop per anchor, and no repeats', () => {
    const ids = WALK_STEPS.map((s) => s.id);
    const anchors = WALK_STEPS.map((s) => anchorFor(s, MADE));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it('never uses a word that keeps score', () => {
    for (const step of WALK_STEPS) {
      const words = [step.title, step.body, step.aside ?? ''].join(' ').toLowerCase();
      for (const unkind of UNKIND) {
        expect(words, `${step.id} says “${unkind}”`).not.toContain(unkind);
      }
    }
  });

  it('starts on Plan, where a day is chosen', () => {
    expect(WALK_STEPS[0].path).toBe('/');
  });

  it('says plainly that the task you type is kept', () => {
    expect(stepNamed('task').aside).toMatch(/stays in your planner/i);
  });

  it('names the panel for every stop on Plan, so a narrow screen can show it', () => {
    for (const step of WALK_STEPS.filter((s) => s.path === '/')) {
      expect(step.panel, step.id).toBeDefined();
    }
  });

  it('goes Plan, Goals, Manage, and comes back to Plan to schedule', () => {
    const places = WALK_STEPS.map((s) => s.path.split('/')[1] || 'plan').filter((p, i, all) => p !== all[i - 1]);
    expect(places).toEqual(['plan', 'goals', 'manage', 'plan']);
  });

  it('offers to clear the sample before you make your own', () => {
    const order = WALK_STEPS.map((s) => s.id);
    expect(stepNamed('clear').action).toBe('clear-sample');
    expect(order.indexOf('clear')).toBeLessThan(order.indexOf('group'));
    expect(stepNamed('clear').body).toMatch(/added yourself stays/i);
  });

  it('then goes with you through a group and a category, a task, and a time for it', () => {
    expect(WALK_STEPS.slice(-3).map((s) => s.id)).toEqual(['group', 'first-task', 'schedule']);
    expect(stepNamed('group').advanceOn).toBe('category');
    expect(stepNamed('first-task').advanceOn).toBe('task');
  });

  it('follows what you make: your new group, your new category, your new task', () => {
    expect(anchorFor(stepNamed('group'), {})).toBe('add-group');
    expect(anchorFor(stepNamed('group'), { group: 'g-mine' })).toBe('add-category-g-mine');
    expect(anchorFor(stepNamed('first-task'), { category: 'c-mine' })).toBe('add-task-c-mine');
    expect(anchorFor(stepNamed('schedule'), { task: 't-mine' })).toBe('task-t-mine');
    // Folded away, the task can still be found through Later.
    expect(stepNamed('schedule').fallbackAnchorId).toBe('later-title');
  });

  it('only waits on things a person can actually do', () => {
    for (const step of WALK_STEPS) {
      if (step.advanceOn) expect(['task', 'block', 'category']).toContain(step.advanceOn);
    }
  });
});

describe('clearing the sample away', () => {
  const mine = (over: Partial<Task> = {}): Task => ({
    id: 't-mine',
    title: 'Water the basil',
    notes: '',
    status: 'open',
    blocks: [],
    createdAt: '2026-09-20T08:00:00',
    ...over,
  });
  const withMine = (state: GaiaState, task: Task): GaiaState => ({ ...state, tasks: [...state.tasks, task] });

  it('leaves a fresh sample planner empty, with its settings kept', () => {
    const seed = { ...createSeed(), settings: { ...createSeed().settings, palette: 'rouen' as const } };
    const cleared = withoutSample(seed);
    expect(cleared.groups).toEqual([]);
    expect(cleared.categories).toEqual([]);
    expect(cleared.tasks).toEqual([]);
    expect(cleared.goals).toEqual([]);
    expect(cleared.habits).toEqual([]);
    expect(cleared.checkIns).toEqual([]);
    expect(cleared.settings.palette).toBe('rouen');
  });

  it('keeps anything you added, like the task from the walk', () => {
    const cleared = withoutSample(withMine(createSeed(), mine()));
    expect(cleared.tasks.map((t) => t.id)).toEqual(['t-mine']);
  });

  it('keeps a sample category, and its group, when something of yours is filed there', () => {
    const cleared = withoutSample(withMine(createSeed(), mine({ categoryId: 'c-health' })));
    expect(cleared.categories.map((c) => c.id)).toEqual(['c-health']);
    expect(cleared.groups.map((g) => g.id)).toEqual(['g-personal']);
  });

  it('keeps a sample goal when something of yours points at it', () => {
    const cleared = withoutSample(withMine(createSeed(), mine({ goalId: 'goal-stats' })));
    expect(cleared.goals.map((g) => g.id)).toEqual(['goal-stats']);
  });

  it('knows when there is nothing left to clear', () => {
    const seed = createSeed();
    expect(hasSample(seed)).toBe(true);
    const cleared = withoutSample(seed);
    expect(hasSample(cleared)).toBe(false);
    expect(withoutSample(cleared)).toBe(cleared);
  });

  it('leaves the starter from “delete everything” alone', () => {
    const empty = createEmpty();
    expect(withoutSample(empty)).toBe(empty);
  });
});
