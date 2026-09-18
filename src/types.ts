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

export type Priority = 'low' | 'medium' | 'high';

/**
 * `let-go` is a deliberate, kind exit: the task keeps its history but is neither
 * open nor done. It never appears in a day list, a count, or a search default.
 */
export type TaskStatus = 'open' | 'done' | 'let-go';

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
 * A task only references its category. Its group is always derived from the
 * category, so the hierarchy is strictly Group → Category → Task.
 *
 * `goalId` is an optional lens on top of that hierarchy, never a part of it.
 */
export interface Task {
  id: ID;
  title: string;
  categoryId: ID;
  status: TaskStatus;
  priority: Priority;
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

export interface Reflection {
  id: ID;
  /** startOfWeek(date): the natural key, so a week can only have one reflection. */
  weekStart: string;
  wentWell?: string;
  wasHard?: string;
  oneThing?: string;
  createdAt: string;
  updatedAt?: string;
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
  /** Gentle mode applies only to the date it names: tiny versions, no figures. */
  gentleDayDate?: string;
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
  settings: Settings;
}
