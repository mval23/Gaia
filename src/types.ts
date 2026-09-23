export type ID = string;

/** An Outlook calendar a group mirrors: its time blocks go there, its events show here. */
export interface CalendarLink {
  id: string;
  name: string;
}

export interface Group {
  id: ID;
  name: string;
  color: string;
  order: number;
  calendar?: CalendarLink;
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  groupId: ID;
  order: number;
}

/**
 * `let-go` is a deliberate, kind exit: the task keeps its history but is neither
 * open nor done. It never appears in a day list, a count, or a search default.
 *
 * `waiting` means someone else has it for now. The screen never calls it
 * "waiting", because Later already waits: it reads "With someone else".
 */
export type TaskStatus = 'open' | 'done' | 'let-go' | 'waiting';

export interface Schedule {
  /** Local calendar date, YYYY-MM-DD */
  date: string;
  /** Minutes from midnight */
  startMin: number;
  durationMin: number;
}

/** One scheduled session of a task. A task can have any number of blocks. */
export interface TimeBlock extends Schedule {
  id: ID;
}

/**
 * Time kept for rest: a series, a nap, an evening with nobody in it. It belongs
 * to no task, because nothing about it has to be finished.
 */
export interface Rest extends Schedule {
  id: ID;
  /** What the rest is, in the person's words. Optional: rest needs no reason. */
  label?: string;
}

/**
 * A task only references its category. Its group is always derived from the
 * category, so the hierarchy is strictly Group → Category → Task.
 *
 * A task may also have no category yet. It waits in the Inbox until it is
 * sorted into one, or is simply done from there; nothing requires it to move.
 *
 * `goalId` is an optional lens on top of that hierarchy, never a part of it.
 */
export interface Task {
  id: ID;
  title: string;
  categoryId?: ID;
  status: TaskStatus;
  due?: string;
  notes: string;
  blocks: TimeBlock[];
  completedAt?: string;
  createdAt: string;
  goalId?: ID;
  /** The day the user chose this task for. Absent means it waits under Later. */
  plannedFor?: string;
  /** How often that choice has moved; a gentle nudge appears after a few moves. */
  plannedMoves?: number;
  /** The day this task is "the one that matters". At most one task per day. */
  essentialFor?: string;
  /** Who has it while the status is `waiting`. Kept afterwards, as a memory. */
  waitingOn?: string;
  /** The day it went to someone else. Cleared when it comes back. */
  waitingSince?: string;
  /** Things that come back: finishing one plans the next. */
  repeat?: Repeat;
}

/**
 * How often a task comes back. `daysOfWeek` matches Date.getDay(); `everyDays`
 * counts from the day it was finished, so a task never piles up while you are away.
 */
export type Repeat = { type: 'daysOfWeek'; days: number[] } | { type: 'everyDays'; days: number };

/** Only for goals that are truly countable. Never shown as a percentage. */
export interface Milestone {
  target: number;
  current: number;
  /** "sections drafted", "sessions" … */
  unit?: string;
}

/** "If it rains, then I walk the stairs." In the person's words. */
export interface IfThen {
  when: string;
  then: string;
}

export type GoalKind = 'finish' | 'ongoing';

/** All four are equal choices, and every one of them keeps its history. */
export type GoalStatus = 'active' | 'paused' | 'completed' | 'released';

/** A soft timeframe, never a deadline. Either end may be missing. */
export interface Season {
  start?: string;
  end?: string;
}

export interface Goal {
  id: ID;
  title: string;
  /** Private, and only shown back to the person who wrote it. */
  why?: string;
  /** Optional: a goal borrows its category's colour. It is not owned by it. */
  categoryId?: ID;
  kind: GoalKind;
  /** Only meaningful for a 'finish' goal. */
  doneLooksLike?: string;
  season?: Season;
  status: GoalStatus;
  closingNote?: string;
  milestone?: Milestone;
  createdAt: string;
  closedAt?: string;
}

/** `days` uses Date.getDay() numbering, 0 = Sunday, matching startOfWeek/weekDates. */
export type Rhythm =
  | { type: 'daysOfWeek'; days: number[] }
  | { type: 'timesPerWeek'; times: number };

export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: ID;
  title: string;
  categoryId: ID;
  goalId?: ID;
  rhythm: Rhythm;
  /** "After I finish lunch" — an implementation intention, in the person's words. */
  cue?: string;
  /** The smallest version that still counts, for low-capacity days. */
  tinyVersion?: string;
  /** Renders as a dashed suggestion on the timeline. A suggestion, not a commitment. */
  preferredStartMin?: number;
  /** Private. Shown under the habit on gentle days. */
  why?: string;
  /** Plans for what usually gets in the way. */
  ifThen?: IfThen[];
  /** What helps to pick it up again. Shown after a few quiet days, instead of anything about the gap. */
  comingBack?: string;
  status: HabitStatus;
  createdAt: string;
}

/**
 * Only positive or neutral entries are ever stored. A day with no entry is
 * "not logged" — there is deliberately no value that means "missed".
 */
export type CheckInKind = 'done' | 'tiny' | 'rest';

export interface CheckIn {
  habitId: ID;
  /** Local calendar date, YYYY-MM-DD. One entry per habit per day. */
  date: string;
  kind: CheckInKind;
}

/** A week, or a month. Both are looked back on the same way. */
export type Period = 'week' | 'month';

export interface Reflection {
  id: ID;
  /**
   * The first day of the period: startOfWeek(date) for a week, the 1st for a
   * month. One reflection per period, so writing again edits the same one.
   */
  weekStart: string;
  /** Saves written before months existed are weeks. */
  period: Period;
  wentWell?: string;
  wasHard?: string;
  oneThing?: string;
  /** Anything else, in the person's words. Never inspected, never summarised. */
  journal?: string;
  createdAt: string;
  updatedAt?: string;
}

/** Three descriptions of a morning. None of them is the wrong light. */
export type Energy = 'low' | 'some' | 'good';
export type Sleep = 'rough' | 'okay' | 'rested';
export type Mind = 'calm' | 'full' | 'heavy';

/** Gentle asks less of you, Bright has room for more. The day's shape, not a grade. */
export type DayShape = 'gentle' | 'steady' | 'bright';

/**
 * One morning, described rather than scored. Every field is optional: a day
 * with no entry is simply not logged, and an earlier day can be filled in
 * whenever, with nothing marking it as late.
 */
export interface Light {
  /** Local calendar date, YYYY-MM-DD. One entry per day. */
  date: string;
  energy?: Energy;
  sleep?: Sleep;
  mind?: Mind;
  /** Only set when the person picked a shape themselves; otherwise it is suggested. */
  shape?: DayShape;
}

/** How a goal is moving, in one word of the person's choosing. */
export type Momentum = 'moving' | 'steady' | 'snagged' | 'resting';

/** What a snagged goal is snagged on. Each one points at something small to change. */
export type Snag = 'clarity' | 'time' | 'energy' | 'setup';

export interface GoalCheckIn {
  goalId: ID;
  /** The first day of the week it belongs to: one check-in per goal per week. */
  date: string;
  momentum: Momentum;
  snag?: Snag;
  note?: string;
}

export type Theme = 'light' | 'dark' | 'system';

/** Each palette is drawn from one of the paintings in monet/. */
export type Palette = 'lilies' | 'rouen' | 'giverny' | 'waterloo';

export interface Settings {
  theme: Theme;
  palette: Palette;
  timeFormat: '24h' | '12h';
  /** Waking-hours window, in hours; used for summary and timeline emphasis */
  dayStartHour: number;
  dayEndHour: number;
  /** Hides every count and figure, for anyone who finds tracking stressful. */
  hideNumbers: boolean;
  /**
   * Gentle mode applies only to the date it names: tiny versions, no figures.
   * Kept for saves written before day shapes; `migrateState` turns it into a
   * Light entry with shape 'gentle'.
   */
  gentleDayDate?: string;
  /** A soft line on the timeline where the working day is meant to end. */
  workEndsMin?: number;
  /** Which weekday offers the reflection card. 0 = Sunday. */
  reflectionWeekday: number;
  /** The day a week begins on: 0 = Sunday, 1 = Monday. */
  weekStart: number;
}

export interface GaiaState {
  groups: Group[];
  categories: Category[];
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  checkIns: CheckIn[];
  reflections: Reflection[];
  lights: Light[];
  goalCheckIns: GoalCheckIn[];
  rests: Rest[];
  settings: Settings;
}
