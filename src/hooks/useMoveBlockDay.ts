import { useCallback } from 'react';
import { useFeedback, useGaia } from '../store/GaiaProvider';
import { addDays, formatLongDate } from '../lib/dates';

/** Moves one time block to an earlier or later day, keeping its time (Alt + ←/→ on a block). */
export function useMoveBlockDay() {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();

  return useCallback(
    (taskId: string, blockId: string, delta: number) => {
      const task = state.tasks.find((t) => t.id === taskId);
      const block = task?.blocks.find((b) => b.id === blockId);
      if (!task || !block) return;
      const date = addDays(block.date, delta);
      dispatch({
        type: 'block/update',
        taskId,
        blockId,
        schedule: { date, startMin: block.startMin, durationMin: block.durationMin },
      });
      announce(`${task.title} moved to ${formatLongDate(date)}`);
    },
    [state.tasks, dispatch, announce],
  );
}
