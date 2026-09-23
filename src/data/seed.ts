import type {
  Category,
  CheckIn,
  CheckInKind,
  GaiaState,
  Goal,
  GoalCheckIn,
  Group,
  Habit,
  Light,
  Rest,
  Settings,
  Task,
} from '../types';
import { addDays, startOfWeek, todayISO } from '../lib/dates';

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  palette: 'lilies',
  timeFormat: '24h',
  dayStartHour: 7,
  dayEndHour: 23,
  hideNumbers: false,
  reflectionWeekday: 0,
  weekStart: 0,
  workEndsMin: 18 * 60,
};

export function createSeed(today = todayISO()): GaiaState {
  const groups: Group[] = [
    { id: 'g-work', name: 'Work', color: '#A7B6CC', order: 0 },
    { id: 'g-personal', name: 'Personal', color: '#CDB4C3', order: 1 },
    { id: 'g-other', name: 'Other', color: '#C3C9BE', order: 2 },
  ];

  const categories: Category[] = [
    { id: 'c-client-a', name: 'Client A', color: '#B3A7D6', groupId: 'g-work', order: 0 },
    { id: 'c-client-b', name: 'Client B', color: '#A9C3E0', groupId: 'g-work', order: 1 },
    { id: 'c-client-c', name: 'Client C', color: '#A3C29D', groupId: 'g-work', order: 2 },
    { id: 'c-internal', name: 'Internal', color: '#BDD3B0', groupId: 'g-work', order: 3 },
    { id: 'c-university', name: 'University', color: '#E6BCCB', groupId: 'g-personal', order: 0 },
    { id: 'c-health', name: 'Health', color: '#9FD0BA', groupId: 'g-personal', order: 1 },
    { id: 'c-home', name: 'Home', color: '#D9CBBE', groupId: 'g-personal', order: 2 },
    { id: 'c-finance', name: 'Finance', color: '#B6C3D6', groupId: 'g-personal', order: 3 },
    { id: 'c-misc', name: 'Miscellaneous', color: '#C8C6D0', groupId: 'g-other', order: 0 },
  ];

  const created = `${today}T08:00:00`;
  // Goals and habits are not brand new: they have a few months behind them.
  const started = `${addDays(today, -90)}T08:00:00`;

  // Two goals: one that finishes, one that is simply a direction.
  const goals: Goal[] = [
    {
      id: 'goal-rested',
      title: 'Feel more rested',
      why: 'More patience with my kids in the evening.',
      categoryId: 'c-health',
      kind: 'ongoing',
      status: 'active',
      createdAt: started,
    },
    {
      id: 'goal-stats',
      title: 'Pass Statistics this semester',
      categoryId: 'c-university',
      kind: 'finish',
      doneLooksLike: 'Final exam passed.',
      season: { end: addDays(today, 90) },
      // Countable, so it may have a milestone. Most goals never will.
      milestone: { target: 8, current: 3, unit: 'units reviewed' },
      status: 'active',
      createdAt: started,
    },
  ];

  const habits: Habit[] = [
    {
      id: 'h-screens',
      title: 'Screens off by 10:30',
      categoryId: 'c-health',
      goalId: 'goal-rested',
      rhythm: { type: 'daysOfWeek', days: [0, 1, 2, 3, 4, 5, 6] },
      cue: 'When I plug my phone into the kitchen charger',
      tinyVersion: 'Put the phone in another room',
      why: 'Mornings go better when the night ends on time.',
      ifThen: [{ when: 'If a series is still on at 10:30', then: 'I finish the episode and stop there' }],
      comingBack: 'Tonight only the tiny version. Nothing to catch up on.',
      preferredStartMin: 22 * 60 + 30,
      status: 'active',
      createdAt: started,
    },
    {
      id: 'h-walk',
      title: 'Short walk after lunch',
      categoryId: 'c-health',
      goalId: 'goal-rested',
      rhythm: { type: 'timesPerWeek', times: 3 },
      cue: 'After lunch',
      tinyVersion: 'Step outside for 2 minutes',
      preferredStartMin: 13 * 60,
      status: 'active',
      createdAt: started,
    },
    {
      id: 'h-stats',
      title: 'Study stats for 25 minutes',
      categoryId: 'c-university',
      goalId: 'goal-stats',
      rhythm: { type: 'daysOfWeek', days: [1, 3, 5] },
      cue: 'After my 2pm class, in the library',
      tinyVersion: 'Open my notes and do one problem',
      preferredStartMin: 14 * 60 + 30,
      status: 'active',
      createdAt: started,
    },
    {
      // A habit with no goal at all: most of life is like this, and that is fine.
      id: 'h-run',
      title: 'Morning run',
      categoryId: 'c-health',
      rhythm: { type: 'timesPerWeek', times: 3 },
      tinyVersion: 'Walk to the corner and back',
      preferredStartMin: 7 * 60,
      status: 'active',
      createdAt: started,
    },
  ];

  // A fortnight of history, with real gaps left blank rather than marked.
  const checkIns: CheckIn[] = [];
  const log = (habitId: string, daysAgo: number, kind: CheckInKind = 'done') =>
    checkIns.push({ habitId, date: addDays(today, -daysAgo), kind });

  [1, 2, 3, 5, 6, 7, 9, 11, 12, 13].forEach((d) => log('h-screens', d));
  log('h-screens', 4, 'tiny');
  log('h-screens', 8, 'rest');
  [2, 5, 8, 9, 12].forEach((d) => log('h-walk', d));
  log('h-walk', 1, 'tiny');
  [1, 3, 8, 10].forEach((d) => log('h-stats', d));
  log('h-stats', 5, 'tiny');
  [3, 6, 10, 13].forEach((d) => log('h-run', d));

  const t = (id: string, title: string, categoryId: string | undefined, extra: Partial<Task> = {}): Task => ({
    id,
    title,
    categoryId,
    status: 'open',
    notes: '',
    createdAt: created,
    blocks: [],
    ...extra,
  });

  const tasks: Task[] = [
    t('t-1', 'Prepare presentation', 'c-client-a', {
      due: addDays(today, 1),
      plannedFor: today,
      // Worked on across two sessions: a task can be scheduled many times.
      blocks: [
        { id: 'b-1a', date: today, startMin: 16 * 60, durationMin: 60 },
        { id: 'b-1b', date: addDays(today, 1), startMin: 10 * 60, durationMin: 120 },
      ],
    }),
    t('t-2', 'Review monthly report', 'c-client-a'),
    t('t-3', 'Send documentation', 'c-client-a'),
    // Someone else has this one for now.
    t('t-18', 'Signed contract', 'c-client-a', { status: 'waiting', waitingOn: 'Laura', waitingSince: addDays(today, -3) }),
    t('t-4', 'Update Power BI dashboard', 'c-client-b', {
      plannedFor: today,
      blocks: [{ id: 'b-4', date: today, startMin: 9 * 60, durationMin: 90 }],
    }),
    t('t-5', 'Client follow-up', 'c-client-b', { due: today, plannedFor: today, essentialFor: today }),
    t('t-6', 'Prepare quarterly summary', 'c-client-c'),
    t('t-7', 'Client call', 'c-client-c', {
      plannedFor: today,
      blocks: [{ id: 'b-7', date: today, startMin: 11 * 60 + 15, durationMin: 45 }],
    }),
    t('t-8', 'Weekly team sync notes', 'c-internal', { status: 'done', completedAt: `${today}T09:30:00` }),
    t('t-9', 'Algorithms assignment', 'c-university', { due: addDays(today, 4) }),
    t('t-10', 'Study statistics', 'c-university', {
      goalId: 'goal-stats',
      plannedFor: today,
      blocks: [
        { id: 'b-10a', date: today, startMin: 14 * 60, durationMin: 90 },
        { id: 'b-10b', date: addDays(today, 2), startMin: 14 * 60, durationMin: 60 },
      ],
    }),
    t('t-11', 'Ask professor about the exam format', 'c-university', { goalId: 'goal-stats' }),
    t('t-12', 'Book dentist appointment', 'c-health'),
    t('t-13', 'Water the plants', 'c-home', { status: 'done', completedAt: `${today}T08:10:00` }),
    t('t-14', 'Organize bookshelf', 'c-home'),
    t('t-15', 'Pay credit card bill', 'c-finance', { due: addDays(today, 2) }),
    t('t-16', 'Move the charger out of the bedroom', 'c-home', { goalId: 'goal-rested' }),
    t('t-17', 'Renew library card', 'c-misc', {
      blocks: [{ id: 'b-17', date: addDays(today, 2), startMin: 17 * 60 + 30, durationMin: 30 }],
    }),
    // Two things kept in passing with Capture, not yet sorted.
    t('t-20', 'Call the landlord about the heater', undefined, { createdAt: `${today}T08:40:00` }),
    t('t-21', 'Idea: a reading corner by the window', undefined, { createdAt: `${addDays(today, -2)}T21:10:00` }),
  ];

  // A fortnight of mornings, described rather than scored, with real gaps.
  const lights: Light[] = [
    { date: today, energy: 'some', sleep: 'rested', mind: 'calm' },
    { date: addDays(today, -1), energy: 'good', sleep: 'okay', mind: 'full' },
    { date: addDays(today, -2), energy: 'low', sleep: 'rough', mind: 'heavy' },
    { date: addDays(today, -3), energy: 'some', sleep: 'okay', mind: 'calm' },
    { date: addDays(today, -5), energy: 'good', sleep: 'rested', mind: 'calm' },
    { date: addDays(today, -6), energy: 'some', sleep: 'rough', mind: 'full' },
    { date: addDays(today, -8), energy: 'good', sleep: 'rested', mind: 'calm' },
    { date: addDays(today, -9), energy: 'some', sleep: 'okay', mind: 'calm' },
  ];

  // Four weeks of one goal's own words for how it is moving.
  const goalCheckIns: GoalCheckIn[] = [
    { goalId: 'goal-stats', date: startOfWeek(addDays(today, -7)), momentum: 'moving', note: 'Two evenings on the problem sets.' },
    { goalId: 'goal-stats', date: startOfWeek(addDays(today, -14)), momentum: 'snagged', snag: 'clarity', note: 'Wrote down the next three topics.' },
    { goalId: 'goal-rested', date: startOfWeek(addDays(today, -7)), momentum: 'steady' },
    { goalId: 'goal-rested', date: startOfWeek(addDays(today, -21)), momentum: 'resting', note: 'Away for the week, on purpose.' },
  ];

  // Evenings kept for rest. Nothing asks what they were spent on.
  const rests: Rest[] = [
    { id: 'rest-1', date: today, startMin: 20 * 60, durationMin: 90, label: 'Series, on purpose' },
    { id: 'rest-2', date: addDays(today, -2), startMin: 15 * 60, durationMin: 45, label: 'Nap' },
  ];

  return {
    groups,
    categories,
    tasks,
    goals,
    habits,
    checkIns,
    reflections: [],
    lights,
    goalCheckIns,
    rests,
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * A clean slate for "delete everything". It keeps one group and one category
 * so there is somewhere to sort into, and a state with no groups fails
 * validation on the next load.
 */
export function createEmpty(): GaiaState {
  return {
    groups: [{ id: 'g-personal', name: 'Personal', color: '#CDB4C3', order: 0 }],
    categories: [{ id: 'c-everyday', name: 'Everyday', color: '#9FD0BA', groupId: 'g-personal', order: 0 }],
    tasks: [],
    goals: [],
    habits: [],
    checkIns: [],
    reflections: [],
    lights: [],
    goalCheckIns: [],
    rests: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
