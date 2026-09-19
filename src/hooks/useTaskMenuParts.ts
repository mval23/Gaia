import type { Task } from '../types';
import type { MenuEntry } from '../components/ui/Menu';
import { useFeedback, useGaia } from '../store/GaiaProvider';
import { useTaskEditor } from './useTaskEditor';

/**
 * The menu entries a task row and a timeline block share, so both read the same:
 * - `essential`: "The one that matters" while the day has none, or "Not the one
 *   today" on the task that has it. One per day, so no other task offers it.
 * - `plan`: "Plan for this day" when the task isn't already chosen for it.
 * - `end`: the ways a task leaves the plate, with Delete last.
 */
export function useTaskMenuParts(task: Task, date: string | undefined) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openTask } = useTaskEditor();
  const done = task.status === 'done';
  const withSomeone = task.status === 'waiting';

  const dayHasEssential =
    !!date && state.tasks.some((t) => t.essentialFor === date && t.id !== task.id && t.status !== 'let-go');

  const essential: MenuEntry[] =
    !date || done || withSomeone
      ? []
      : task.essentialFor === date
        ? [
            {
              label: 'Not the one today',
              icon: 'star',
              onSelect: () => {
                dispatch({ type: 'task/essential', id: task.id, date: undefined });
                announce(`${task.title} is back in the list`);
              },
            },
          ]
        : dayHasEssential
          ? []
          : [
              {
                label: 'The one that matters',
                icon: 'star',
                onSelect: () => {
                  dispatch({ type: 'task/essential', id: task.id, date });
                  announce(`${task.title} is the one that matters today`);
                },
              },
            ];

  const plan: MenuEntry[] =
    date && task.plannedFor !== date && !done && !withSomeone
      ? [
          {
            label: 'Plan for this day',
            icon: 'plan',
            onSelect: () => {
              dispatch({ type: 'task/plan', id: task.id, date });
              announce(`${task.title} is on today's list`);
            },
          },
        ]
      : [];

  const end: MenuEntry[] = [
    ...(withSomeone
      ? [
          {
            label: 'It’s back with me',
            icon: 'handoff' as const,
            onSelect: () => {
              dispatch({ type: 'task/update', id: task.id, patch: { status: 'open' } });
              announce(`${task.title} is back with you`);
            },
          },
        ]
      : task.status === 'open'
        ? [
            {
              label: 'It’s with someone else…',
              icon: 'handoff' as const,
              onSelect: () => {
                dispatch({ type: 'task/update', id: task.id, patch: { status: 'waiting' } });
                // The editor asks who has it; leaving that blank is fine too.
                openTask(task.id);
              },
            },
          ]
        : []),
    ...(task.status !== 'let-go'
      ? [
          {
            label: 'Let it go',
            icon: 'unschedule' as const,
            onSelect: () => {
              const previous = state;
              dispatch({ type: 'task/update', id: task.id, patch: { status: 'let-go' } });
              dispatch({ type: 'task/unschedule', id: task.id });
              notify(`Let go. "${task.title}" is still in your history.`, previous);
            },
          },
        ]
      : []),
    {
      label: 'Delete task',
      icon: 'trash',
      danger: true,
      onSelect: () => {
        const previous = state;
        dispatch({ type: 'task/delete', id: task.id });
        notify(`“${task.title}” deleted`, previous);
      },
    },
  ];

  return { essential, plan, end };
}

/** Joins non-empty groups with separators: three groups at most, as Apple's context-menu guidance asks. */
export function joinMenuGroups(groups: MenuEntry[][]): MenuEntry[] {
  return groups
    .filter((group) => group.length > 0)
    .flatMap((group, i) => (i === 0 ? group : [{ kind: 'separator' as const }, ...group]));
}
