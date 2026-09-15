import type { Category, GaiaState, Group, Priority, Schedule, Settings, Task, TimeBlock } from '../types';
import { MIN_DURATION, DAY_MIN, clamp } from '../lib/time';

export type Action =
  | { type: 'task/add'; id: string; categoryId: string; title: string }
  | { type: 'task/update'; id: string; patch: Partial<Omit<Task, 'id' | 'createdAt' | 'blocks'>> }
  | { type: 'task/toggle'; id: string }
  | { type: 'task/delete'; id: string }
  /** Adds another scheduled session to a task. */
  | { type: 'block/add'; taskId: string; block: TimeBlock }
  /** Moves or resizes one session, optionally to another day. */
  | { type: 'block/update'; taskId: string; blockId: string; schedule: Schedule }
  | { type: 'block/remove'; taskId: string; blockId: string }
  /** Removes a task's sessions, either all of them or only those on `date`. */
  | { type: 'task/unschedule'; id: string; date?: string }
  | { type: 'category/add'; id: string; groupId: string; name: string; color: string }
  | { type: 'category/update'; id: string; patch: Partial<Pick<Category, 'name' | 'color'>> }
  | { type: 'category/move'; id: string; groupId: string; index: number }
  | { type: 'category/delete'; id: string }
  | { type: 'group/add'; id: string; name: string; color: string }
  | { type: 'group/update'; id: string; patch: Partial<Pick<Group, 'name' | 'color'>> }
  | { type: 'group/move'; id: string; index: number }
  | { type: 'group/delete'; id: string; moveCategoriesTo: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/replace'; state: GaiaState };

const nowStamp = () => new Date().toISOString();

export function normalizeSchedule(s: Schedule): Schedule {
  const durationMin = clamp(Math.round(s.durationMin), MIN_DURATION, DAY_MIN);
  const startMin = clamp(Math.round(s.startMin), 0, DAY_MIN - durationMin);
  return { date: s.date, startMin, durationMin };
}

function normalizeBlock(b: TimeBlock): TimeBlock {
  return { id: b.id, ...normalizeSchedule(b) };
}

function sortBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => (item.order === i ? item : { ...item, order: i }));
}

function mapTask(state: GaiaState, id: string, fn: (t: Task) => Task): GaiaState {
  return { ...state, tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)) };
}

export function reducer(state: GaiaState, action: Action): GaiaState {
  switch (action.type) {
    case 'task/add': {
      const title = action.title.trim();
      if (!title || !state.categories.some((c) => c.id === action.categoryId)) return state;
      const task: Task = {
        id: action.id,
        title,
        categoryId: action.categoryId,
        status: 'open',
        priority: 'medium' as Priority,
        notes: '',
        createdAt: nowStamp(),
        blocks: [],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'task/update':
      return mapTask(state, action.id, (t) => {
        const next = { ...t, ...action.patch };
        if (action.patch.categoryId && !state.categories.some((c) => c.id === action.patch.categoryId)) {
          next.categoryId = t.categoryId;
        }
        if (action.patch.status && action.patch.status !== t.status) {
          next.completedAt = action.patch.status === 'done' ? nowStamp() : undefined;
        }
        return next;
      });
    case 'task/toggle':
      return mapTask(state, action.id, (t) =>
        t.status === 'done'
          ? { ...t, status: 'open', completedAt: undefined }
          : { ...t, status: 'done', completedAt: nowStamp() },
      );
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'block/add':
      return mapTask(state, action.taskId, (t) => ({
        ...t,
        blocks: sortBlocks([...t.blocks, normalizeBlock(action.block)]),
      }));
    case 'block/update':
      return mapTask(state, action.taskId, (t) =>
        t.blocks.some((b) => b.id === action.blockId)
          ? {
              ...t,
              blocks: sortBlocks(
                t.blocks.map((b) => (b.id === action.blockId ? normalizeBlock({ ...action.schedule, id: b.id }) : b)),
              ),
            }
          : t,
      );
    case 'block/remove':
      return mapTask(state, action.taskId, (t) => ({ ...t, blocks: t.blocks.filter((b) => b.id !== action.blockId) }));
    case 'task/unschedule':
      return mapTask(state, action.id, (t) => ({
        ...t,
        blocks: action.date ? t.blocks.filter((b) => b.date !== action.date) : [],
      }));

    case 'category/add': {
      const name = action.name.trim();
      if (!name || !state.groups.some((g) => g.id === action.groupId)) return state;
      const order = state.categories.filter((c) => c.groupId === action.groupId).length;
      return {
        ...state,
        categories: [...state.categories, { id: action.id, name, color: action.color, groupId: action.groupId, order }],
      };
    }
    case 'category/update':
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'category/move': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat || !state.groups.some((g) => g.id === action.groupId)) return state;
      const others = state.categories.filter((c) => c.id !== action.id);
      const source = reindex(others.filter((c) => c.groupId === cat.groupId).sort((a, b) => a.order - b.order));
      const target = others.filter((c) => c.groupId === action.groupId).sort((a, b) => a.order - b.order);
      const dest = action.groupId === cat.groupId ? source : target;
      const index = clamp(action.index, 0, dest.length);
      const nextDest = reindex([...dest.slice(0, index), { ...cat, groupId: action.groupId }, ...dest.slice(index)]);
      const touched = new Map<string, Category>();
      if (action.groupId !== cat.groupId) source.forEach((c) => touched.set(c.id, c));
      nextDest.forEach((c) => touched.set(c.id, c));
      const untouched = others.filter((c) => !touched.has(c.id));
      return { ...state, categories: [...untouched, ...touched.values()] };
    }
    case 'category/delete': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat) return state;
      const remaining = state.categories.filter((c) => c.id !== action.id);
      const siblings = reindex(remaining.filter((c) => c.groupId === cat.groupId).sort((a, b) => a.order - b.order));
      return {
        ...state,
        categories: [...remaining.filter((c) => c.groupId !== cat.groupId), ...siblings],
        tasks: state.tasks.filter((t) => t.categoryId !== action.id),
      };
    }

    case 'group/add': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        groups: [...state.groups, { id: action.id, name, color: action.color, order: state.groups.length }],
      };
    }
    case 'group/update':
      return { ...state, groups: state.groups.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) };
    case 'group/move': {
      const sorted = [...state.groups].sort((a, b) => a.order - b.order);
      const from = sorted.findIndex((g) => g.id === action.id);
      if (from === -1) return state;
      const [item] = sorted.splice(from, 1);
      sorted.splice(clamp(action.index, 0, sorted.length), 0, item);
      return { ...state, groups: reindex(sorted) };
    }
    case 'group/delete': {
      if (action.id === action.moveCategoriesTo || state.groups.length <= 1) return state;
      if (!state.groups.some((g) => g.id === action.moveCategoriesTo)) return state;
      const base = state.categories.filter((c) => c.groupId === action.moveCategoriesTo).length;
      const moved = state.categories
        .filter((c) => c.groupId === action.id)
        .sort((a, b) => a.order - b.order)
        .map((c, i) => ({ ...c, groupId: action.moveCategoriesTo, order: base + i }));
      return {
        ...state,
        groups: reindex(state.groups.filter((g) => g.id !== action.id).sort((a, b) => a.order - b.order)),
        categories: [...state.categories.filter((c) => c.groupId !== action.id), ...moved],
      };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'state/replace':
      return action.state;
  }
}
