/**
 * The walk: six short stops that point at the real thing on the real page.
 *
 * It is always something you asked for, from the sidebar menu. Gaia never
 * starts it on its own, and leaving halfway is a perfectly good ending.
 */

export interface WalkStep {
  id: string;
  /** Where this stop lives. The walk moves there before it points at anything. */
  path: string;
  /** The element the note points at. These ids already label their sections. */
  anchorId: string;
  title: string;
  body: string;
  /** A quieter line, for the things worth saying exactly once. */
  aside?: string;
  /** Narrow screens show one panel at a time; this is the one the anchor is in. */
  panel?: 'tasks' | 'day';
  /** The walk moves on by itself when you do the thing. It never waits for it. */
  advanceOn?: 'task' | 'block';
}

export const WALK_STEPS: WalkStep[] = [
  {
    id: 'today',
    path: '/',
    anchorId: 'day-title',
    title: 'This is today',
    body: 'Gaia shows what you chose for today, and nothing else. Yesterday doesn’t follow you here.',
    aside: 'What you’re looking at is a sample week, so Gaia isn’t empty while you explore. Settings ▸ Your data clears it whenever you like.',
    panel: 'tasks',
  },
  {
    id: 'rhythms',
    path: '/',
    anchorId: 'rhythms-title',
    title: 'Your rhythms',
    body: 'Habits live here with a rhythm — about three times a week — instead of a number to keep up. You can log one as done, tiny, or rest.',
    aside: 'A blank day just stays blank.',
    panel: 'tasks',
  },
  {
    id: 'task',
    path: '/',
    anchorId: 'today-add',
    title: 'Add something of your own',
    body: 'Type anything you’d like to do today. One small thing is plenty.',
    aside: 'Whatever you write stays in your planner after the walk ends.',
    panel: 'tasks',
    advanceOn: 'task',
  },
  {
    id: 'timeline',
    path: '/',
    anchorId: 'day-panel-title',
    title: 'Give it a time, if you want one',
    body: 'Drag a task onto the timeline to say when you’ll do it.',
    aside: 'What stays empty is open time. It’s yours, and it isn’t waste.',
    panel: 'day',
    advanceOn: 'block',
  },
  {
    id: 'later',
    path: '/',
    anchorId: 'later-title',
    title: 'Everything else waits here',
    body: 'Later holds what you haven’t chosen, folded away until you want it.',
    aside: 'Nothing in it is late.',
    panel: 'tasks',
  },
  {
    id: 'goals',
    path: '/goals',
    anchorId: 'goals-title',
    title: 'What matters to you',
    body: 'A goal is a direction, not a deadline. Tasks and habits can point at one — most never will, and that’s fine.',
    aside: 'That’s the walk. It’s in the menu under your planner whenever you’d like it again.',
  },
];

/** Where the walk goes next, or null when it has reached the end. */
export function nextIndex(index: number): number | null {
  return index + 1 < WALK_STEPS.length ? index + 1 : null;
}

/** The step at this position, or null once the walk is over. */
export function stepAt(index: number | null): WalkStep | null {
  if (index === null) return null;
  return WALK_STEPS[index] ?? null;
}

export function isLastStep(index: number): boolean {
  return index === WALK_STEPS.length - 1;
}
