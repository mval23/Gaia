/**
 * The walk: short stops that point at the real thing on the real page.
 *
 * It is always something you asked for, from the sidebar menu. Gaia never
 * starts it on its own, and leaving halfway is a perfectly good ending.
 */

/** What you have made during the walk, newest of each, so later stops can point at it. */
export interface Made {
  group?: string;
  category?: string;
  task?: string;
}

export interface WalkStep {
  id: string;
  /** Where this stop lives. The walk moves there before it points at anything. */
  path: string;
  /**
   * The element the note points at, by id. Some stops follow what you have
   * just made, so they work it out from that.
   */
  anchorId: string | ((made: Made) => string);
  /** Where to point instead if the first choice isn't on the page, say because a list is folded. */
  fallbackAnchorId?: string;
  /** Something the card itself can do, besides moving on. */
  action?: 'clear-sample';
  title: string;
  body: string;
  /** A quieter line, for the things worth saying exactly once. */
  aside?: string;
  /** Narrow screens show one panel at a time; this is the one the anchor is in. */
  panel?: 'tasks' | 'day';
  /** The walk moves on by itself when you do the thing. It never waits for it. */
  advanceOn?: 'task' | 'block' | 'category';
}

export const WALK_STEPS: WalkStep[] = [
  {
    id: 'today',
    path: '/',
    anchorId: 'day-title',
    title: 'This is today',
    body: 'Gaia shows what you chose for today, and nothing else. Yesterday doesn’t follow you here.',
    aside: 'What you’re looking at is a sample week, so Gaia isn’t empty while you explore. Near the end of the walk you can clear it away.',
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
    aside: 'A goal can rest, finish, or be let go, and it keeps its history either way.',
  },
  {
    id: 'habits',
    path: '/goals',
    anchorId: 'habits-title',
    title: 'Habits, and their tiny versions',
    body: 'Each habit has a cue, a flexible rhythm, and a tiny version for the days when that’s all there is. The tiny version still counts.',
    aside: 'A habit can point at a goal, or at nothing at all.',
  },
  {
    id: 'manage',
    path: '/manage/tasks',
    anchorId: 'manage-tabs',
    title: 'Where everything lives',
    body: 'Manage is the workshop. Tasks shows every task in its group and category. Groups & categories is where you shape them.',
  },
  {
    id: 'find',
    path: '/manage/tasks',
    anchorId: 'manage-find',
    title: 'Find anything',
    body: 'Search, or narrow things down by group, category or status. Every task can be changed right where it sits.',
    aside: 'Tasks without a category wait in the Inbox, to sort whenever.',
  },
  {
    id: 'clear',
    path: '/manage/groups',
    anchorId: 'manage-title',
    title: 'Make room for your own',
    body: 'Before you add your own things, you can clear the sample away: its groups, categories, tasks, goals and habits. Anything you’ve added yourself stays.',
    aside: 'You can undo it straight after, or keep the sample for now and carry on.',
    action: 'clear-sample',
  },
  {
    id: 'group',
    path: '/manage/groups',
    // Add group first; once there is a new group, its own Add category.
    anchorId: (made) => (made.group ? `add-category-${made.group}` : 'add-group'),
    title: 'Make a group, then a category',
    body: 'Press Add group and name a part of your life, like Work, Home or Studies. Then give it a first category, like Clients or Errands.',
    aside: 'Colours are picked for you, and you can change them whenever.',
    advanceOn: 'category',
  },
  {
    id: 'first-task',
    path: '/manage/tasks',
    anchorId: (made) => (made.category ? `add-task-${made.category}` : 'manage-find'),
    title: 'Add a task to it',
    body: 'Write a first task in your new category. Something small is perfect.',
    aside: 'It waits in Later, on Plan, until you give it a day or a time.',
    advanceOn: 'task',
  },
  {
    id: 'schedule',
    path: '/',
    anchorId: (made) => (made.task ? `task-${made.task}` : 'later-title'),
    fallbackAnchorId: 'later-title',
    title: 'Give it a time',
    body: 'Here it is. Open its ⋯ menu and choose Schedule next free hour, or drag it onto the timeline.',
    aside: 'That’s the walk, and it’s in the menu under your planner if you’d like it again.',
    panel: 'tasks',
  },
];

/** The element this stop points at, given what you have made so far. */
export function anchorFor(step: WalkStep, made: Made): string {
  return typeof step.anchorId === 'function' ? step.anchorId(made) : step.anchorId;
}

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
