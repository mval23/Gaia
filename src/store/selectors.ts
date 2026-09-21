import type { Category, CheckInKind, GaiaState, Goal, Group, Habit, Task, TimeBlock } from '../types';
import { addDays, startOfWeek, weekDates } from '../lib/dates';
import { isOnRhythm, weeklyTarget } from '../lib/rhythm';

export const GROUP_ALL = 'all';

export function sortedGroups(state: GaiaState): Group[] {
  return [...state.groups].sort((a, b) => a.order - b.order);
}

export function categoriesInGroup(state: GaiaState, groupId: string): Category[] {
  return state.categories.filter((c) => c.groupId === groupId).sort((a, b) => a.order - b.order);
}

export function categoryById(state: GaiaState, id: string | undefined): Category | undefined {
  return id ? state.categories.find((c) => c.id === id) : undefined;
}

export function groupById(state: GaiaState, id: string): Group | undefined {
  return state.groups.find((g) => g.id === id);
}

/** The only way to learn a task's group: through its category. */
export function groupOfTask(state: GaiaState, task: Task): Group | undefined {
  const cat = categoryById(state, task.categoryId);
  return cat ? groupById(state, cat.groupId) : undefined;
}

export function taskInGroupFilter(state: GaiaState, task: Task, groupFilter: string): boolean {
  if (groupFilter === GROUP_ALL) return true;
  return categoryById(state, task.categoryId)?.groupId === groupFilter;
}

export function tasksInCategory(state: GaiaState, categoryId: string): Task[] {
  return state.tasks.filter((t) => t.categoryId === categoryId);
}

/** No category yet, or one that is gone: the task waits in the Inbox. */
export function isUncategorized(state: GaiaState, task: Task): boolean {
  return !categoryById(state, task.categoryId);
}

export function activeCount(tasks: Task[]): number {
  return tasks.reduce((n, t) => n + (t.status === 'open' ? 1 : 0), 0);
}

export type TaskStatusFilter = 'open' | 'done' | 'scheduled' | 'unscheduled' | 'let-go';
export type TaskSort = 'due' | 'title';

export interface TaskFilters {
  query?: string;
  groupId?: string | null;
  categoryId?: string | null;
  status?: TaskStatusFilter | null;
  sort?: TaskSort | null;
}

/**
 * The Manage ▸ Tasks list: what the search and filters leave, finished ones at the
 * bottom. A let-go task only shows when asked for, so letting go stays quiet.
 */
export function filterTasks(state: GaiaState, filters: TaskFilters): Task[] {
  const { groupId, categoryId, status, sort } = filters;
  const query = (filters.query ?? '').trim().toLowerCase();
  const groupOf = new Map(state.categories.map((c) => [c.id, c.groupId]));
  const rows = state.tasks.filter((task) => {
    if (query && !task.title.toLowerCase().includes(query) && !task.notes.toLowerCase().includes(query)) return false;
    if (groupId && (!task.categoryId || groupOf.get(task.categoryId) !== groupId)) return false;
    if (categoryId && task.categoryId !== categoryId) return false;
    // With someone else is still unfinished, so it counts as open here.
    if (status === 'open' && task.status !== 'open' && task.status !== 'waiting') return false;
    if (status === 'done' && task.status !== 'done') return false;
    if (status === 'scheduled' && task.blocks.length === 0) return false;
    if (status === 'let-go' && task.status !== 'let-go') return false;
    if (status !== 'let-go' && task.status === 'let-go') return false;
    if (status === 'unscheduled' && (task.blocks.length > 0 || task.status !== 'open')) return false;
    return true;
  });

  return rows.sort((a, b) => {
    // Finished ones settle at the bottom of their category, as on the Plan page.
    const done = Number(a.status === 'done') - Number(b.status === 'done');
    if (done) return done;
    if (sort === 'title') return a.title.localeCompare(b.title);
    const dueA = a.due ?? '9999-99-99';
    const dueB = b.due ?? '9999-99-99';
    return dueA.localeCompare(dueB) || a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * A task belongs in a day's Tasks list when it is unchecked, or when it is on that
 * day's timeline (checked or not). Checked tasks that aren't on the timeline drop out.
 */
export function inDayList(task: Task, date: string): boolean {
  if (task.status === 'let-go') return false;
  return task.status === 'open' || blocksOnDate(task, date).length > 0;
}

/** A task's sessions on one day, earliest first. */
export function blocksOnDate(task: Task, date: string): TimeBlock[] {
  return task.blocks.filter((b) => b.date === date).sort((a, b) => a.startMin - b.startMin);
}

/** The first session on or after `date`, for "next scheduled" hints. */
export function nextBlock(task: Task, date: string): TimeBlock | undefined {
  return [...task.blocks]
    .filter((b) => b.date >= date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)[0];
}

/** Unplanned tasks first (oldest first), then the day's scheduled tasks in time order. */
export function compareDayList(a: Task, b: Task, date: string): number {
  const aFirst = blocksOnDate(a, date)[0];
  const bFirst = blocksOnDate(b, date)[0];
  if (!!aFirst !== !!bFirst) return aFirst ? 1 : -1;
  if (aFirst && bFirst) return aFirst.startMin - bFirst.startMin;
  return a.createdAt.localeCompare(b.createdAt);
}

export interface ScheduledBlock {
  task: Task;
  block: TimeBlock;
}

/** Every session on a day (a task may contribute several), filtered by group. */
export function blocksOn(state: GaiaState, date: string, groupFilter = GROUP_ALL): ScheduledBlock[] {
  const out: ScheduledBlock[] = [];
  for (const task of state.tasks) {
    if (!taskInGroupFilter(state, task, groupFilter)) continue;
    for (const block of task.blocks) if (block.date === date) out.push({ task, block });
  }
  return out.sort((a, b) => a.block.startMin - b.block.startMin);
}

/** All sessions grouped by date, for multi-day views. */
export function blocksByDate(state: GaiaState): Map<string, ScheduledBlock[]> {
  const map = new Map<string, ScheduledBlock[]>();
  for (const task of state.tasks) {
    for (const block of task.blocks) {
      const list = map.get(block.date) ?? [];
      list.push({ task, block });
      map.set(block.date, list);
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.block.startMin - b.block.startMin);
  return map;
}

/** Resolves a URL group param to a real group id, or 'all'. Accepts ids or names. */
export function resolveGroupParam(state: GaiaState, param: string | null): string {
  if (!param || param === GROUP_ALL) return GROUP_ALL;
  const byId = state.groups.find((g) => g.id === param);
  if (byId) return byId.id;
  const byName = state.groups.find((g) => g.name.toLowerCase() === param.toLowerCase());
  return byName ? byName.id : GROUP_ALL;
}

export function groupParamValue(state: GaiaState, groupId: string): string | null {
  if (groupId === GROUP_ALL) return null;
  return groupById(state, groupId)?.name.toLowerCase() ?? null;
}

/* ---------- Goals ---------- */

export function goalById(state: GaiaState, id: string | undefined): Goal | undefined {
  return id ? state.goals.find((g) => g.id === id) : undefined;
}

/** 'resting' is a paused goal: waiting, not failed. 'closed' covers completed and let go. */
export function goalsByStatus(state: GaiaState): { active: Goal[]; resting: Goal[]; closed: Goal[] } {
  const byNewest = (a: Goal, b: Goal) => b.createdAt.localeCompare(a.createdAt);
  return {
    active: state.goals.filter((g) => g.status === 'active').sort(byNewest),
    resting: state.goals.filter((g) => g.status === 'paused').sort(byNewest),
    closed: state.goals
      .filter((g) => g.status === 'completed' || g.status === 'released')
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')),
  };
}

export function habitsForGoal(state: GaiaState, goalId: string): Habit[] {
  return state.habits
    .filter((h) => h.goalId === goalId)
    .sort((a, b) => Number(a.status === 'archived') - Number(b.status === 'archived'));
}

export function tasksForGoal(state: GaiaState, goalId: string): Task[] {
  return state.tasks.filter((t) => t.goalId === goalId);
}

/* ---------- Habits ---------- */

export function habitById(state: GaiaState, id: string | undefined): Habit | undefined {
  return id ? state.habits.find((h) => h.id === id) : undefined;
}

export function habitsInCategory(state: GaiaState, categoryId: string): Habit[] {
  return state.habits.filter((h) => h.categoryId === categoryId);
}

/**
 * A habit rests when the person paused it, archived it, or paused the goal it
 * belongs to. Pausing a goal writes nothing to its habits — it is derived here,
 * so resuming the goal restores exactly the habits the person had running.
 */
export function isHabitResting(state: GaiaState, habit: Habit): boolean {
  if (habit.status !== 'active') return true;
  return goalById(state, habit.goalId)?.status === 'paused';
}

/** Today's rhythms: what belongs on this day, and is not resting. */
export function habitsForDate(state: GaiaState, date: string, groupFilter = GROUP_ALL): Habit[] {
  return state.habits.filter(
    (h) =>
      !isHabitResting(state, h) &&
      isOnRhythm(h.rhythm, date) &&
      (groupFilter === GROUP_ALL || categoryById(state, h.categoryId)?.groupId === groupFilter),
  );
}

export const checkInKey = (habitId: string, date: string) => `${habitId}|${date}`;

/**
 * Build once per render and share it: selectors here are unmemoized, so a
 * per-row scan of every check-in would be O(rows x history).
 */
export function checkInIndex(state: GaiaState): Map<string, CheckInKind> {
  const map = new Map<string, CheckInKind>();
  for (const c of state.checkIns) map.set(checkInKey(c.habitId, c.date), c.kind);
  return map;
}

export function checkInFor(state: GaiaState, habitId: string, date: string): CheckInKind | undefined {
  return state.checkIns.find((c) => c.habitId === habitId && c.date === date)?.kind;
}

/**
 * Progress for the week containing `date`. 'rest' is deliberately not counted:
 * it is neither progress nor a miss, it is a day someone chose for themselves.
 */
export function weekCount(state: GaiaState, habitId: string, date: string): number {
  const week = new Set(weekDates(date, state.settings.weekStart));
  return state.checkIns.filter((c) => c.habitId === habitId && week.has(c.date) && c.kind !== 'rest').length;
}

/** The number that never resets. */
export function totalCount(state: GaiaState, habitId: string): number {
  return state.checkIns.filter((c) => c.habitId === habitId && c.kind !== 'rest').length;
}

export function firstLoggedDate(state: GaiaState, habitId: string): string | undefined {
  return state.checkIns
    .filter((c) => c.habitId === habitId && c.kind !== 'rest')
    .reduce<string | undefined>((min, c) => (!min || c.date < min ? c.date : min), undefined);
}

/** The last day the person touched this habit at all, rest days included. */
export function lastContactDate(state: GaiaState, habitId: string): string | undefined {
  return state.checkIns
    .filter((c) => c.habitId === habitId)
    .reduce<string | undefined>((max, c) => (!max || c.date > max ? c.date : max), undefined);
}

export const QUIET_DAYS = 14;

/** After a genuinely quiet stretch, the habit itself offers to change. Never a notification. */
export function isQuiet(state: GaiaState, habit: Habit, today: string): boolean {
  const last = lastContactDate(state, habit.id) ?? habit.createdAt.slice(0, 10);
  return last <= addDays(today, -QUIET_DAYS);
}

export const RETURNING_DAYS = 5;

/**
 * A few quiet days in, the habit shows the person's own "coming back" note in
 * place of its cue. It never says how long it has been.
 */
export function isReturning(state: GaiaState, habit: Habit, today: string): boolean {
  if (!habit.comingBack?.trim()) return false;
  const last = lastContactDate(state, habit.id) ?? habit.createdAt.slice(0, 10);
  return last <= addDays(today, -RETURNING_DAYS);
}

/** Whether a flexible habit has already met its weekly aim, so it can sort last, kindly. */
export function weekAimMet(state: GaiaState, habit: Habit, date: string): boolean {
  return weekCount(state, habit.id, date) >= weeklyTarget(habit.rhythm);
}

/* ---------- The day: what was chosen, and what waits ---------- */

export interface DayPartition {
  /** "The one that matters" on this day, when one was chosen. Not repeated in `today`. */
  essential?: Task;
  today: Task[];
  /** Tasks someone else has for now: off this person's plate, not forgotten. */
  withSomeone: Task[];
  later: Task[];
}

/**
 * The fix for "every open task, every day". A task belongs to Today only when
 * the person chose it for this date or scheduled it on the timeline; everything
 * else waits under Later, out of sight but not lost. A let-go task is in
 * neither: it keeps its history without asking anything of anyone.
 */
export function partitionDay(state: GaiaState, date: string, groupFilter = GROUP_ALL): DayPartition {
  const today: Task[] = [];
  const later: Task[] = [];
  const withSomeone: Task[] = [];
  let essential: Task | undefined;
  for (const task of state.tasks) {
    if (task.status === 'let-go') continue;
    if (!taskInGroupFilter(state, task, groupFilter)) continue;
    if (task.status === 'waiting') {
      withSomeone.push(task);
      continue;
    }
    // A paused goal's tasks step back to Later, without being touched.
    const resting = goalById(state, task.goalId)?.status === 'paused';
    const onDay = task.plannedFor === date || blocksOnDate(task, date).length > 0;
    if (onDay && !resting) {
      if (task.essentialFor === date && !essential) essential = task;
      else today.push(task);
    } else if (task.status === 'open') later.push(task);
  }
  today.sort((a, b) => compareDayList(a, b, date));
  withSomeone.sort((a, b) => (a.waitingSince ?? '').localeCompare(b.waitingSince ?? ''));
  return { essential, today, withSomeone, later };
}

/** A descriptive line for a goal card: steps taken and days active. Never a percentage. */
export function goalActivity(
  state: GaiaState,
  goal: Goal,
  today: string,
  windowDays = 28,
): { steps: number; totalSteps: number; activeDays: number; windowDays: number } {
  const tasks = tasksForGoal(state, goal.id);
  const since = addDays(today, -windowDays);
  const days = new Set<string>();
  for (const habit of habitsForGoal(state, goal.id)) {
    for (const c of state.checkIns) {
      if (c.habitId === habit.id && c.date > since && c.date <= today) days.add(c.date);
    }
  }
  for (const task of tasks) {
    if (task.status === 'done' && task.completedAt && task.completedAt.slice(0, 10) > since) {
      days.add(task.completedAt.slice(0, 10));
    }
  }
  return {
    steps: tasks.filter((t) => t.status === 'done').length,
    totalSteps: tasks.filter((t) => t.status !== 'let-go').length,
    activeDays: days.size,
    windowDays,
  };
}

/**
 * Where something from the Inbox goes when it becomes a task or a habit: the
 * category of whatever was added most recently, so it lands near what the
 * person is working on. They can move it from its editor.
 */
export function recentCategoryId(state: GaiaState): string | undefined {
  const ids = new Set(state.categories.map((c) => c.id));
  const newest = [...state.tasks]
    .filter((t) => t.categoryId && ids.has(t.categoryId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (newest?.categoryId) return newest.categoryId;
  const first = sortedGroups(state).flatMap((g) => categoriesInGroup(state, g.id))[0];
  return first?.id;
}

/** The week a reflection belongs to. */
export function reflectionForWeek(state: GaiaState, date: string) {
  const weekStart = startOfWeek(date, state.settings.weekStart);
  return state.reflections.find((r) => r.weekStart === weekStart);
}
