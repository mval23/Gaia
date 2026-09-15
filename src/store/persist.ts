import type { GaiaState, Schedule, Task, TimeBlock } from '../types';
import { createSeed } from '../data/seed';

/** Earlier saves stored a single `schedule`; tasks now hold a list of time blocks. */
function migrateTask(raw: Task & { schedule?: Schedule }): Task {
  const { schedule, ...task } = raw;
  const blocks: TimeBlock[] = Array.isArray(raw.blocks) ? raw.blocks : [];
  if (schedule && !blocks.length) blocks.push({ id: `${raw.id}-b1`, ...schedule });
  return { ...task, blocks };
}

const KEY = 'gaia:v1';

function isState(value: unknown): value is GaiaState {
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

export function loadState(): GaiaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isState(parsed)) {
        const seed = createSeed();
        return {
          ...parsed,
          tasks: parsed.tasks.map(migrateTask),
          settings: { ...seed.settings, ...parsed.settings },
        };
      }
    }
  } catch {
    // Storage unavailable or corrupt: fall back to sample data.
  }
  return createSeed();
}

export function saveState(state: GaiaState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / privacy-mode failures; the app keeps working in memory.
  }
}
