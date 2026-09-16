import type { Task, TimeBlock } from '../types';
import type { MenuEntry } from '../components/ui/Menu';
import { useFeedback, useGaia } from '../store/GaiaProvider';
import { blocksOnDate } from '../store/selectors';
import { addDays, formatShortDate, todayISO, weekdayName } from '../lib/dates';

/**
 * "Tomorrow" and "Unschedule" for a task on one day. Given a `block`, Unschedule
 * removes only that session; otherwise it removes all of the day's sessions.
 * Both leave the task on a day's list without a time, ready to be placed again.
 */
export function useDayMoveItems(task: Task, date: string | undefined, block?: TimeBlock): MenuEntry[] {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  if (!date) return [];

  const sessions = block ? [block] : blocksOnDate(task, date);
  const next = addDays(date, 1);
  const isTomorrow = next === addDays(todayISO(), 1);
  const items: MenuEntry[] = [];

  if (task.status !== 'done') {
    items.push({
      label: isTomorrow ? 'Tomorrow' : `Next day · ${weekdayName(next, 'short')}, ${formatShortDate(next)}`,
      icon: 'arrowRight',
      onSelect: () => {
        const previous = state;
        dispatch({ type: 'task/unschedule', id: task.id, date });
        dispatch({ type: 'task/plan', id: task.id, date: next });
        notify(`“${task.title}” moved to ${isTomorrow ? 'tomorrow' : formatShortDate(next)}`, previous);
      },
    });
  }

  if (sessions.length > 0) {
    items.push({
      label: sessions.length > 1 ? `Unschedule (${sessions.length} sessions)` : 'Unschedule',
      icon: 'unschedule',
      onSelect: () => {
        const previous = state;
        if (block) dispatch({ type: 'block/remove', taskId: task.id, blockId: block.id });
        else dispatch({ type: 'task/unschedule', id: task.id, date });
        // Keep it on that day's list, just without a time.
        if (!task.plannedFor) dispatch({ type: 'task/plan', id: task.id, date });
        notify(`“${task.title}” unscheduled`, previous);
      },
    });
  }

  return items;
}
