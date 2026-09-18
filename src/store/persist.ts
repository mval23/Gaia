import type {
  CheckIn,
  CheckInKind,
  GaiaState,
  Goal,
  GoalKind,
  GoalStatus,
  Habit,
  HabitStatus,
  Schedule,
  Task,
  TaskStatus,
  TimeBlock,
} from '../types';
import { createSeed } from '../data/seed';
import { isValidISODate } from '../lib/dates';
import { normalizeRhythm } from '../lib/rhythm';
import { DAY_MIN, clamp } from '../lib/time';

const KEY = 'gaia:v1';

const TASK_STATUSES: TaskStatus[] = ['open', 'done', 'let-go'];
const GOAL_STATUSES: GoalStatus[] = ['active', 'paused', 'completed', 'released'];
const GOAL_KINDS: GoalKind[] = ['finish', 'ongoing'];
const HABIT_STATUSES: HabitStatus[] = ['active', 'paused', 'archived'];
const CHECKIN_KINDS: CheckInKind[] = ['done', 'tiny', 'rest'];

/** Earlier saves stored a single `schedule`; tasks now hold a list of time blocks. */
function migrateTask(raw: Task & { schedule?: Schedule }): Task {
  const { schedule, ...task } = raw;
  const blocks: TimeBlock[] = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (schedule && !blocks.length) blocks.push({ id: `${raw.id}-b1`, ...schedule });
  return {
    ...task,
    blocks,
    status: TASK_STATUSES.includes(raw.status) ? raw.status : 'open',
  };
}

function migrateGoal(raw: Goal, categoryIds: Set<string>): Goal {
  return {
    ...raw,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    kind: GOAL_KINDS.includes(raw.kind) ? raw.kind : 'ongoing',
    status: GOAL_STATUSES.includes(raw.status) ? raw.status : 'active',
    categoryId: raw.categoryId && categoryIds.has(raw.categoryId) ? raw.categoryId : undefined,
  };
}

function migrateHabit(raw: Habit): Habit {
  return {
    ...raw,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    rhythm: normalizeRhythm(raw.rhythm),
    status: HABIT_STATUSES.includes(raw.status) ? raw.status : 'active',
    preferredStartMin:
      typeof raw.preferredStartMin === 'number' && Number.isFinite(raw.preferredStartMin)
        ? clamp(Math.round(raw.preferredStartMin), 0, DAY_MIN - 1)
        : undefined,
  };
}

function isCheckIn(raw: unknown): raw is CheckIn {
  const c = raw as CheckIn;
  return !!c && typeof c.habitId === 'string' && isValidISODate(c.date) && CHECKIN_KINDS.includes(c.kind);
}

/**
 * Deliberately validates ONLY the four original collections. Requiring goals,
 * habits or check-ins here would make every save written before they existed
 * fail validation and be silently replaced by the sample data.
 */
export function isState(value: unknown): value is GaiaState {
  const v = value as GaiaState;
  return (
    !!v &&
    Array.isArray(v.groups) &&
    Array.isArray(v.categories) &&
    Array.isArray(v.tasks) &&
    typeof v.settings === 'object' &&
    v.groups.length > 0
  );
}

/**
 * Fills in collections added after a save was written, so an older save loads
 * without losing anything. The saved data always wins; only missing pieces are
 * defaulted. Exported separately from `loadState` so it can be tested without
 * a browser.
 */
export function migrateState(parsed: GaiaState, seed: GaiaState = createSeed()): GaiaState {
  const categoryIds = new Set((parsed.categories ?? []).map((c) => c.id));
  const habits = Array.isArray(parsed.habits) ? parsed.habits.map(migrateHabit) : [];
  const habitIds = new Set(habits.map((h) => h.id));
  return {
    ...parsed,
    tasks: parsed.tasks.map(migrateTask),
    goals: Array.isArray(parsed.goals) ? parsed.goals.map((g) => migrateGoal(g, categoryIds)) : [],
    habits,
    checkIns: Array.isArray(parsed.checkIns)
      ? parsed.checkIns.filter((c) => isCheckIn(c) && habitIds.has(c.habitId))
      : [],
    reflections: Array.isArray(parsed.reflections) ? parsed.reflections : [],
    settings: { ...seed.settings, ...parsed.settings },
  };
}

/** A saved planner brought up to the current shape, or null if it isn't one. */
export function parseState(value: unknown): GaiaState | null {
  return isState(value) ? migrateState(value) : null;
}

/** The planner saved under `key` in this browser, or null if there isn't a usable one. */
export function readState(key = KEY): GaiaState | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return parseState(JSON.parse(raw));
  } catch {
    // Storage unavailable or corrupt.
  }
  return null;
}

export function loadState(): GaiaState {
  return readState() ?? createSeed();
}

export function saveState(state: GaiaState, key = KEY): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore quota / privacy-mode failures; the app keeps working in memory.
  }
}

/** Everything Gaia knows about you, as readable JSON, for you to keep. */
export function exportJSON(state: GaiaState): string {
  return JSON.stringify(state, null, 2);
}
