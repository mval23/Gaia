import type {
  CheckIn,
  CheckInKind,
  DayShape,
  Energy,
  GaiaState,
  Goal,
  GoalCheckIn,
  GoalKind,
  GoalStatus,
  Habit,
  HabitStatus,
  Light,
  Mind,
  Momentum,
  Rest,
  Schedule,
  Sleep,
  Snag,
  Task,
  TaskStatus,
  TimeBlock,
} from '../types';
import { createSeed } from '../data/seed';
import { isValidISODate } from '../lib/dates';
import { normalizeRhythm } from '../lib/rhythm';
import { normalizeRepeat } from '../lib/repeat';
import { DAY_MIN, clamp } from '../lib/time';
import { normalizeMilestone, normalizeSchedule } from './reducer';

const KEY = 'gaia:v1';

const TASK_STATUSES: TaskStatus[] = ['open', 'done', 'let-go', 'waiting'];
const GOAL_STATUSES: GoalStatus[] = ['active', 'paused', 'completed', 'released'];
const GOAL_KINDS: GoalKind[] = ['finish', 'ongoing'];
const HABIT_STATUSES: HabitStatus[] = ['active', 'paused', 'archived'];
const CHECKIN_KINDS: CheckInKind[] = ['done', 'tiny', 'rest'];
const ENERGIES: Energy[] = ['low', 'some', 'good'];
const SLEEPS: Sleep[] = ['rough', 'okay', 'rested'];
const MINDS: Mind[] = ['calm', 'full', 'heavy'];
const SHAPES: DayShape[] = ['gentle', 'steady', 'bright'];
const MOMENTUMS: Momentum[] = ['moving', 'steady', 'snagged', 'resting'];
const SNAGS: Snag[] = ['clarity', 'time', 'energy', 'setup'];

/**
 * Earlier saves stored a single `schedule`; tasks now hold a list of time blocks.
 * They also carried a `priority`, which is gone. A category that no longer
 * exists leaves the task uncategorized, in the Inbox, rather than lost.
 */
function migrateTask(raw: Task & { schedule?: Schedule; priority?: unknown }, categoryIds: Set<string>): Task {
  const { schedule, priority, ...task } = raw;
  const blocks: TimeBlock[] = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (schedule && !blocks.length) blocks.push({ id: `${raw.id}-b1`, ...schedule });
  return {
    ...task,
    categoryId: raw.categoryId && categoryIds.has(raw.categoryId) ? raw.categoryId : undefined,
    blocks,
    status: TASK_STATUSES.includes(raw.status) ? raw.status : 'open',
    essentialFor: isValidISODate(raw.essentialFor) ? raw.essentialFor : undefined,
    repeat: normalizeRepeat(raw.repeat),
    waitingSince: isValidISODate(raw.waitingSince) ? raw.waitingSince : undefined,
  };
}

function migrateGoal(raw: Goal, categoryIds: Set<string>): Goal {
  return {
    ...raw,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    kind: GOAL_KINDS.includes(raw.kind) ? raw.kind : 'ongoing',
    status: GOAL_STATUSES.includes(raw.status) ? raw.status : 'active',
    categoryId: raw.categoryId && categoryIds.has(raw.categoryId) ? raw.categoryId : undefined,
    milestone: raw.milestone && typeof raw.milestone === 'object' ? normalizeMilestone(raw.milestone) : undefined,
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
    // A plan with neither half written is just an empty row someone added.
    ifThen: Array.isArray(raw.ifThen)
      ? raw.ifThen
          .filter((p) => p && typeof p === 'object')
          .map((p) => ({ when: String(p.when ?? ''), then: String(p.then ?? '') }))
          .filter((p) => p.when.trim() || p.then.trim())
      : undefined,
  };
}

/** Capture used to keep lines apart from tasks. Saves from then still carry them. */
interface LegacyCapture {
  id: string;
  text: string;
  createdAt?: string;
}

function isLegacyCapture(raw: unknown): raw is LegacyCapture {
  const c = raw as LegacyCapture;
  return !!c && typeof c.id === 'string' && typeof c.text === 'string' && c.text.trim() !== '';
}

/** A line kept before Capture made tasks becomes the uncategorized task it now would be. */
function captureToTask(c: LegacyCapture): Task {
  return {
    id: c.id,
    title: c.text.trim(),
    status: 'open',
    notes: '',
    blocks: [],
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
  };
}

/** Keeps only what the three questions allow; anything else is left unlogged. */
function migrateLight(raw: Light): Light | null {
  if (!raw || !isValidISODate(raw.date)) return null;
  const light: Light = {
    date: raw.date,
    energy: ENERGIES.includes(raw.energy as Energy) ? raw.energy : undefined,
    sleep: SLEEPS.includes(raw.sleep as Sleep) ? raw.sleep : undefined,
    mind: MINDS.includes(raw.mind as Mind) ? raw.mind : undefined,
    shape: SHAPES.includes(raw.shape as DayShape) ? raw.shape : undefined,
  };
  return light.energy || light.sleep || light.mind || light.shape ? light : null;
}

function isGoalCheckIn(raw: unknown, goalIds: Set<string>): raw is GoalCheckIn {
  const c = raw as GoalCheckIn;
  return (
    !!c &&
    typeof c.goalId === 'string' &&
    goalIds.has(c.goalId) &&
    isValidISODate(c.date) &&
    MOMENTUMS.includes(c.momentum)
  );
}

function migrateRest(raw: Rest): Rest | null {
  if (!raw || typeof raw.id !== 'string' || !isValidISODate(raw.date)) return null;
  return { id: raw.id, label: raw.label, ...normalizeSchedule(raw) };
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
  const goals = Array.isArray(parsed.goals) ? parsed.goals.map((g) => migrateGoal(g, categoryIds)) : [];
  const goalIds = new Set(goals.map((g) => g.id));

  const lights = Array.isArray(parsed.lights)
    ? parsed.lights.map(migrateLight).filter((l): l is Light => l !== null)
    : [];
  // A gentle day was the first day shape. It becomes one, so the day keeps its shape.
  const { gentleDayDate, ...settings } = parsed.settings ?? {};
  if (isValidISODate(gentleDayDate) && !lights.some((l) => l.date === gentleDayDate)) {
    lights.push({ date: gentleDayDate, shape: 'gentle' });
  }
  const { captures, ...rest } = parsed as GaiaState & { captures?: unknown };
  const taskIds = new Set(parsed.tasks.map((t) => t.id));
  const fromCaptures = Array.isArray(captures)
    ? captures.filter(isLegacyCapture).filter((c) => !taskIds.has(c.id)).map(captureToTask)
    : [];
  return {
    ...rest,
    tasks: [...parsed.tasks.map((t) => migrateTask(t, categoryIds)), ...fromCaptures],
    goals,
    habits,
    checkIns: Array.isArray(parsed.checkIns)
      ? parsed.checkIns.filter((c) => isCheckIn(c) && habitIds.has(c.habitId))
      : [],
    // Every reflection written before months existed is a week's.
    reflections: Array.isArray(parsed.reflections)
      ? parsed.reflections.map((r) => ({ ...r, period: r.period === 'month' ? 'month' : ('week' as const) }))
      : [],
    lights,
    goalCheckIns: Array.isArray(parsed.goalCheckIns)
      ? parsed.goalCheckIns.filter((c): c is GoalCheckIn => isGoalCheckIn(c, goalIds)).map((c) => ({
          ...c,
          snag: c.momentum === 'snagged' && SNAGS.includes(c.snag as Snag) ? c.snag : undefined,
        }))
      : [],
    rests: Array.isArray(parsed.rests) ? parsed.rests.map(migrateRest).filter((r): r is Rest => r !== null) : [],
    settings: { ...seed.settings, ...settings },
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
