import type { Category, GaiaState, Group, Task, TimeBlock } from '../types';

export const GROUP_ALL = 'all';

export function sortedGroups(state: GaiaState): Group[] {
  return [...state.groups].sort((a, b) => a.order - b.order);
}

export function categoriesInGroup(state: GaiaState, groupId: string): Category[] {
  return state.categories.filter((c) => c.groupId === groupId).sort((a, b) => a.order - b.order);
}

export function categoryById(state: GaiaState, id: string): Category | undefined {
  return state.categories.find((c) => c.id === id);
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

export function activeCount(tasks: Task[]): number {
  return tasks.reduce((n, t) => n + (t.status === 'open' ? 1 : 0), 0);
}

/**
 * A task belongs in a day's Tasks list when it is unchecked, or when it is on that
 * day's timeline (checked or not). Checked tasks that aren't on the timeline drop out.
 */
export function inDayList(task: Task, date: string): boolean {
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

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Unplanned tasks first (by priority), then the day's scheduled tasks in time order. */
export function compareDayList(a: Task, b: Task, date: string): number {
  const aFirst = blocksOnDate(a, date)[0];
  const bFirst = blocksOnDate(b, date)[0];
  if (!!aFirst !== !!bFirst) return aFirst ? 1 : -1;
  if (aFirst && bFirst) return aFirst.startMin - bFirst.startMin;
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt);
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
