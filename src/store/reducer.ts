import type {
  Category,
  CheckInKind,
  GaiaState,
  Goal,
  GoalKind,
  GoalStatus,
  Group,
  Habit,
  Milestone,
  Priority,
  Reflection,
  Rhythm,
  Schedule,
  Settings,
  Task,
  TimeBlock,
} from '../types';
import { MIN_DURATION, DAY_MIN, clamp } from '../lib/time';
import { isValidISODate, todayISO } from '../lib/dates';
import { DEFAULT_RHYTHM, normalizeRhythm } from '../lib/rhythm';

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
  /** Chooses the day a task is for; `date: undefined` sends it back to Later. */
  | { type: 'task/plan'; id: string; date?: string }
  /** Makes a task "the one that matters" on `date`, or stops it being so (`date: undefined`). */
  | { type: 'task/essential'; id: string; date?: string }
  /** Keeps one line in the Inbox. */
  | { type: 'capture/add'; id: string; text: string }
  | { type: 'capture/remove'; id: string }
  | { type: 'category/add'; id: string; groupId: string; name: string; color: string }
  | { type: 'category/update'; id: string; patch: Partial<Pick<Category, 'name' | 'color'>> }
  | { type: 'category/move'; id: string; groupId: string; index: number }
  | { type: 'category/delete'; id: string }
  | { type: 'group/add'; id: string; name: string; color: string }
  | { type: 'group/update'; id: string; patch: Partial<Pick<Group, 'name' | 'color' | 'calendar'>> }
  | { type: 'group/move'; id: string; index: number }
  | { type: 'group/delete'; id: string; moveCategoriesTo: string }
  | { type: 'goal/add'; id: string; title: string; kind: GoalKind; categoryId?: string }
  | { type: 'goal/update'; id: string; patch: Partial<Omit<Goal, 'id' | 'createdAt' | 'status' | 'closedAt'>> }
  /** Pause, resume, complete or let go. One verb, because they are equal choices. */
  | { type: 'goal/setStatus'; id: string; status: GoalStatus; closingNote?: string; archiveHabits?: boolean }
  | { type: 'goal/delete'; id: string }
  | { type: 'habit/add'; id: string; categoryId: string; title: string; goalId?: string; rhythm?: Rhythm }
  | { type: 'habit/update'; id: string; patch: Partial<Omit<Habit, 'id' | 'createdAt'>> }
  | { type: 'habit/delete'; id: string }
  /** Upserts the single entry for (habitId, date). */
  | { type: 'checkin/set'; habitId: string; date: string; kind: CheckInKind }
  | { type: 'checkin/clear'; habitId: string; date: string }
  /** Upserts by `weekStart`; an entirely empty reflection is never stored. */
  | {
      type: 'reflection/save';
      id: string;
      weekStart: string;
      patch: Partial<Pick<Reflection, 'wentWell' | 'wasHard' | 'oneThing'>>;
    }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/replace'; state: GaiaState };

const nowStamp = () => new Date().toISOString();

const trimmed = (value?: string) => {
  const t = value?.trim();
  return t ? t : undefined;
};

/** A milestone with a whole, positive target and a count that stays within it. */
export function normalizeMilestone(m: Milestone | undefined): Milestone | undefined {
  if (!m) return undefined;
  const target = Math.max(1, Math.round(Number(m.target) || 1));
  const current = clamp(Math.round(Number(m.current) || 0), 0, target);
  return { target, current, unit: m.unit };
}

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

function mapGoal(state: GaiaState, id: string, fn: (g: Goal) => Goal): GaiaState {
  return { ...state, goals: state.goals.map((g) => (g.id === id ? fn(g) : g)) };
}

function mapHabit(state: GaiaState, id: string, fn: (h: Habit) => Habit): GaiaState {
  return { ...state, habits: state.habits.map((h) => (h.id === id ? fn(h) : h)) };
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
        // Never store a dangling goal reference.
        if (action.patch.goalId && !state.goals.some((g) => g.id === action.patch.goalId)) {
          next.goalId = t.goalId;
        }
        if (action.patch.status && action.patch.status !== t.status) {
          const finished = action.patch.status === 'done' || action.patch.status === 'let-go';
          next.completedAt = finished ? nowStamp() : undefined;
          // Going to someone else starts today unless told otherwise; coming back clears it.
          if (action.patch.status === 'waiting') next.waitingSince = action.patch.waitingSince ?? todayISO();
          else next.waitingSince = undefined;
        }
        return next;
      });
    case 'task/toggle':
      // Open or with someone else becomes done. Anything else comes back as open,
      // so a let-go task is never stranded.
      return mapTask(state, action.id, (t) =>
        t.status === 'open' || t.status === 'waiting'
          ? { ...t, status: 'done', completedAt: nowStamp(), waitingSince: undefined }
          : { ...t, status: 'open', completedAt: undefined },
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
    case 'task/plan':
      return mapTask(state, action.id, (t) => {
        if (t.plannedFor === action.date) return t;
        if (action.date !== undefined && !isValidISODate(action.date)) return t;
        // Only a move from one chosen day to another counts; going back to Later does not.
        const moved = t.plannedFor !== undefined && action.date !== undefined;
        return {
          ...t,
          // "The one that matters" belongs to a day, so it stays behind when the task moves.
          essentialFor: t.essentialFor === action.date ? t.essentialFor : undefined,
          plannedFor: action.date,
          plannedMoves: moved ? (t.plannedMoves ?? 0) + 1 : t.plannedMoves,
        };
      });

    case 'task/essential': {
      const target = state.tasks.find((t) => t.id === action.id);
      if (!target) return state;
      const date = action.date;
      if (date === undefined) {
        return mapTask(state, action.id, (t) => ({ ...t, essentialFor: undefined }));
      }
      if (!isValidISODate(date)) return state;
      // One per day: choosing a new one quietly steps the previous one back into the list.
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id === action.id) return { ...t, essentialFor: date, plannedFor: t.plannedFor ?? date };
          return t.essentialFor === date ? { ...t, essentialFor: undefined } : t;
        }),
      };
    }

    case 'capture/add': {
      const text = action.text.trim();
      if (!text) return state;
      return { ...state, captures: [{ id: action.id, text, createdAt: nowStamp() }, ...state.captures] };
    }
    case 'capture/remove':
      return { ...state, captures: state.captures.filter((c) => c.id !== action.id) };

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
      const goneHabits = new Set(state.habits.filter((h) => h.categoryId === action.id).map((h) => h.id));
      return {
        ...state,
        categories: [...remaining.filter((c) => c.groupId !== cat.groupId), ...siblings],
        tasks: state.tasks.filter((t) => t.categoryId !== action.id),
        habits: state.habits.filter((h) => !goneHabits.has(h.id)),
        checkIns: state.checkIns.filter((c) => !goneHabits.has(c.habitId)),
        // A goal only borrows a category's colour, so it survives losing it.
        goals: state.goals.map((g) => (g.categoryId === action.id ? { ...g, categoryId: undefined } : g)),
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
      // Categories are re-homed rather than deleted, so tasks, habits and goals
      // follow their category and need no changes here.
      return {
        ...state,
        groups: reindex(state.groups.filter((g) => g.id !== action.id).sort((a, b) => a.order - b.order)),
        categories: [...state.categories.filter((c) => c.groupId !== action.id), ...moved],
      };
    }

    case 'goal/add': {
      const title = action.title.trim();
      if (!title) return state;
      const categoryId =
        action.categoryId && state.categories.some((c) => c.id === action.categoryId) ? action.categoryId : undefined;
      const goal: Goal = {
        id: action.id,
        title,
        kind: action.kind,
        categoryId,
        status: 'active',
        createdAt: nowStamp(),
      };
      return { ...state, goals: [...state.goals, goal] };
    }
    case 'goal/update':
      return mapGoal(state, action.id, (g) => {
        const next = { ...g, ...action.patch };
        if (action.patch.title !== undefined) next.title = action.patch.title.trim() || g.title;
        if (action.patch.categoryId && !state.categories.some((c) => c.id === action.patch.categoryId)) {
          next.categoryId = g.categoryId;
        }
        if ('milestone' in action.patch) next.milestone = normalizeMilestone(action.patch.milestone);
        return next;
      });
    case 'goal/setStatus': {
      const goal = state.goals.find((g) => g.id === action.id);
      if (!goal) return state;
      const closed = action.status === 'completed' || action.status === 'released';
      const next: Goal = {
        ...goal,
        status: action.status,
        closingNote: closed ? trimmed(action.closingNote) ?? goal.closingNote : undefined,
        closedAt: closed ? nowStamp() : undefined,
      };
      // Check-ins are never touched: the history is the point.
      const habits =
        closed && action.archiveHabits
          ? state.habits.map((h) =>
              h.goalId === goal.id && h.status !== 'archived' ? { ...h, status: 'archived' as const } : h,
            )
          : state.habits;
      return { ...state, goals: state.goals.map((g) => (g.id === goal.id ? next : g)), habits };
    }
    case 'goal/delete': {
      if (!state.goals.some((g) => g.id === action.id)) return state;
      // A goal is a lens, not a parent: its tasks and habits are unlinked, never deleted.
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        tasks: state.tasks.map((t) => (t.goalId === action.id ? { ...t, goalId: undefined } : t)),
        habits: state.habits.map((h) => (h.goalId === action.id ? { ...h, goalId: undefined } : h)),
      };
    }

    case 'habit/add': {
      const title = action.title.trim();
      if (!title || !state.categories.some((c) => c.id === action.categoryId)) return state;
      const habit: Habit = {
        id: action.id,
        title,
        categoryId: action.categoryId,
        goalId: action.goalId && state.goals.some((g) => g.id === action.goalId) ? action.goalId : undefined,
        rhythm: action.rhythm ? normalizeRhythm(action.rhythm) : DEFAULT_RHYTHM,
        status: 'active',
        createdAt: nowStamp(),
      };
      return { ...state, habits: [...state.habits, habit] };
    }
    case 'habit/update':
      return mapHabit(state, action.id, (h) => {
        const next = { ...h, ...action.patch };
        if (action.patch.title !== undefined) next.title = action.patch.title.trim() || h.title;
        if (action.patch.categoryId && !state.categories.some((c) => c.id === action.patch.categoryId)) {
          next.categoryId = h.categoryId;
        }
        if (action.patch.goalId && !state.goals.some((g) => g.id === action.patch.goalId)) {
          next.goalId = h.goalId;
        }
        if (action.patch.rhythm) next.rhythm = normalizeRhythm(action.patch.rhythm);
        if (action.patch.preferredStartMin !== undefined) {
          next.preferredStartMin = clamp(Math.round(action.patch.preferredStartMin), 0, DAY_MIN - 1);
        }
        return next;
      });
    case 'habit/delete': {
      if (!state.habits.some((h) => h.id === action.id)) return state;
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        checkIns: state.checkIns.filter((c) => c.habitId !== action.id),
      };
    }

    case 'checkin/set': {
      if (!isValidISODate(action.date) || !state.habits.some((h) => h.id === action.habitId)) return state;
      const others = state.checkIns.filter((c) => !(c.habitId === action.habitId && c.date === action.date));
      return {
        ...state,
        checkIns: [...others, { habitId: action.habitId, date: action.date, kind: action.kind }],
      };
    }
    case 'checkin/clear':
      return {
        ...state,
        checkIns: state.checkIns.filter((c) => !(c.habitId === action.habitId && c.date === action.date)),
      };

    case 'reflection/save': {
      if (!isValidISODate(action.weekStart)) return state;
      const existing = state.reflections.find((r) => r.weekStart === action.weekStart);
      const merged = { ...existing, ...action.patch };
      const entry: Reflection = {
        id: existing?.id ?? action.id,
        weekStart: action.weekStart,
        wentWell: trimmed(merged.wentWell),
        wasHard: trimmed(merged.wasHard),
        oneThing: trimmed(merged.oneThing),
        createdAt: existing?.createdAt ?? nowStamp(),
        updatedAt: existing ? nowStamp() : undefined,
      };
      const others = state.reflections.filter((r) => r.weekStart !== action.weekStart);
      // Nothing written means nothing stored: skipping a week leaves no trace.
      const empty = !entry.wentWell && !entry.wasHard && !entry.oneThing;
      return { ...state, reflections: empty ? others : [...others, entry] };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'state/replace':
      return action.state;
  }
}
