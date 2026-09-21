import { describe, expect, it } from 'vitest';
import { WALK_STEPS, isLastStep, nextIndex, stepAt } from './walkSteps';

/** The words Gaia never uses, from the conventions in the README. */
const UNKIND = ['missed', 'overdue', 'failed', 'fail', 'streak', 'behind', 'catch up'];

describe('the walk', () => {
  it('is short enough to finish', () => {
    expect(WALK_STEPS.length).toBeLessThanOrEqual(6);
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

  it('gives every stop something real to point at', () => {
    for (const step of WALK_STEPS) {
      expect(step.anchorId, step.id).toMatch(/^[a-z][a-z-]*$/);
      expect(step.path, step.id).toMatch(/^\//);
      expect(step.title.length, step.id).toBeGreaterThan(0);
      expect(step.body.length, step.id).toBeGreaterThan(0);
    }
  });

  it('has one stop per anchor, and no repeats', () => {
    const ids = WALK_STEPS.map((s) => s.id);
    const anchors = WALK_STEPS.map((s) => s.anchorId);
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
    const step = WALK_STEPS.find((s) => s.advanceOn === 'task');
    expect(step?.aside).toMatch(/stays in your planner/i);
  });

  it('names the panel for every stop on Plan, so a narrow screen can show it', () => {
    for (const step of WALK_STEPS.filter((s) => s.path === '/')) {
      expect(step.panel, step.id).toBeDefined();
    }
  });

  it('only waits on things a person can actually do', () => {
    for (const step of WALK_STEPS) {
      if (step.advanceOn) expect(['task', 'block']).toContain(step.advanceOn);
    }
  });
});
