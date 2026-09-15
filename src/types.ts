export type ID = string;

export interface Group {
  id: ID;
  name: string;
  color: string;
  order: number;
}

export interface Category {
  id: ID;
  name: string;
  color: string;
  groupId: ID;
  order: number;
}

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'done';

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
}

export interface Settings {
  timeFormat: '24h' | '12h';
  /** Waking-hours window, in hours; used for summary and timeline emphasis */
  dayStartHour: number;
  dayEndHour: number;
}

export interface GaiaState {
  groups: Group[];
  categories: Category[];
  tasks: Task[];
  settings: Settings;
}
