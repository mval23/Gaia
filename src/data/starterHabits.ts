import type { GaiaState, Habit } from '../types';
import { categoriesInGroup, sortedGroups } from '../store/selectors';

/**
 * Three habits to begin with, each with a tiny version for hard days. They
 * come from Mariana's own week: a flexible gym rhythm, a weekday morning
 * start, and an evening shutdown before work nights.
 */
export type StarterHabit = Pick<
  Habit,
  'title' | 'rhythm' | 'cue' | 'tinyVersion' | 'preferredStartMin' | 'why' | 'ifThen' | 'comingBack'
> & { key: string };

export const STARTER_HABITS: StarterHabit[] = [
  {
    key: 'move',
    title: 'Move my body',
    rhythm: { type: 'timesPerWeek', times: 3 },
    cue: 'After work, on gym days',
    tinyVersion: 'Gym clothes on, a 10-minute walk',
    preferredStartMin: 17 * 60,
    why: 'So my body has somewhere to put the day.',
    ifThen: [{ when: 'If it rains', then: 'I walk the stairs and call it done' }],
    comingBack: 'After a quiet week, I start with the tiny version',
  },
  {
    key: 'morning',
    title: 'Morning start',
    rhythm: { type: 'daysOfWeek', days: [1, 2, 3, 4, 5] },
    cue: 'When I get up',
    tinyVersion: 'Water, wash, and write one thing that matters',
    preferredStartMin: 7 * 60,
    why: 'A day I chose feels lighter than one that happened to me.',
    ifThen: [{ when: 'If I reach for my phone first', then: 'I open Gaia instead of anything else' }],
    comingBack: 'Any morning is a fine morning to start again',
  },
  {
    key: 'shutdown',
    title: 'Evening shutdown',
    rhythm: { type: 'daysOfWeek', days: [0, 1, 2, 3, 4] },
    cue: 'When the series window ends',
    tinyVersion: 'Write tomorrow’s first step, phone in another room',
    preferredStartMin: 22 * 60 + 15,
    why: 'So tomorrow starts with a decision already made.',
    ifThen: [{ when: 'If I’m still working at 10', then: 'I write where I stopped and close the laptop' }],
    comingBack: 'Just tonight’s tiny version, nothing to catch up on',
  },
];

/** A Health category if there is one, otherwise the first category in Personal, otherwise any. */
export function starterCategoryId(state: GaiaState): string | undefined {
  const health = state.categories.find((c) => c.name.trim().toLowerCase() === 'health');
  if (health) return health.id;
  const groups = sortedGroups(state);
  const personal = groups.find((g) => g.name.trim().toLowerCase() === 'personal');
  const inPersonal = personal ? categoriesInGroup(state, personal.id)[0] : undefined;
  return inPersonal?.id ?? groups.flatMap((g) => categoriesInGroup(state, g.id))[0]?.id;
}

/** Already in the planner under the same name, so it is not offered twice. */
export function hasHabitNamed(state: GaiaState, title: string): boolean {
  const t = title.trim().toLowerCase();
  return state.habits.some((h) => h.title.trim().toLowerCase() === t);
}
