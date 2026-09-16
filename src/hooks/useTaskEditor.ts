import { useSheetParam } from './useSheetParam';

/** The task editor sheet is addressed by `?task=<id>` on any route. */
export function useTaskEditor() {
  const { id, open, close } = useSheetParam('task');
  return { taskId: id, openTask: open, closeTask: close };
}
