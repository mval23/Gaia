import type { GaiaState } from '../types';
import { createSeed } from './seed';

/** The ids the sample planner is made of. They are fixed, and new things never get one. */
const SAMPLE = (() => {
  const seed = createSeed();
  const ids = (items: { id: string }[]) => new Set(items.map((item) => item.id));
  return {
    groups: ids(seed.groups),
    categories: ids(seed.categories),
    tasks: ids(seed.tasks),
    goals: ids(seed.goals),
    habits: ids(seed.habits),
  };
})();

/**
 * The planner without the sample's own groups, categories, tasks, goals and
 * habits. Everything you made stays, and so does any sample category, group
 * or goal that something of yours is filed under. Returns the same state when
 * there is nothing sample left to clear.
 */
export function withoutSample(state: GaiaState): GaiaState {
  const tasks = state.tasks.filter((t) => !SAMPLE.tasks.has(t.id));
  const habits = state.habits.filter((h) => !SAMPLE.habits.has(h.id));

  const goalsInUse = new Set([...tasks, ...habits].map((x) => x.goalId));
  const goals = state.goals.filter((g) => !SAMPLE.goals.has(g.id) || goalsInUse.has(g.id));

  const categoriesInUse = new Set([...tasks, ...habits, ...goals].map((x) => x.categoryId));
  const categories = state.categories.filter((c) => !SAMPLE.categories.has(c.id) || categoriesInUse.has(c.id));

  const groupsInUse = new Set(categories.map((c) => c.groupId));
  const groups = state.groups.filter((g) => !SAMPLE.groups.has(g.id) || groupsInUse.has(g.id));

  const unchanged =
    tasks.length === state.tasks.length &&
    habits.length === state.habits.length &&
    goals.length === state.goals.length &&
    categories.length === state.categories.length &&
    groups.length === state.groups.length;
  if (unchanged) return state;

  const habitIds = new Set(habits.map((h) => h.id));
  return {
    ...state,
    groups,
    categories,
    tasks,
    goals,
    habits,
    checkIns: state.checkIns.filter((c) => habitIds.has(c.habitId)),
  };
}

export function hasSample(state: GaiaState): boolean {
  return withoutSample(state) !== state;
}
