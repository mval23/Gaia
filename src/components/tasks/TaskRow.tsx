import { useState } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { blocksOnDate, categoriesInGroup, nextBlock, sortedGroups } from '../../store/selectors';
import { useDragActions, useDragSession } from '../../dnd/DragProvider';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { formatShortDate } from '../../lib/dates';
import { formatClock, formatRange } from '../../lib/time';
import { CompleteToggle } from '../ui/CompleteToggle';
import { Icon } from '../ui/Icon';
import { Menu, type MenuEntry } from '../ui/Menu';
import { InlineTitle } from './InlineTitle';
import styles from './tasks.module.css';

interface TaskRowProps {
  task: Task;
  /** The day the list is showing; used for the schedule chip and completion behaviour. */
  date?: string;
  onScheduleNext?: (task: Task) => void;
}

const PRIORITY_LABEL = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' } as const;

export function TaskRow({ task, date, onScheduleNext }: TaskRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { startTaskDrag } = useDragActions();
  const session = useDragSession();
  const { openTask } = useTaskEditor();
  const [menuView, setMenuView] = useState<'main' | 'move'>('main');
  const [editing, setEditing] = useState(false);
  const done = task.status === 'done';
  const dragging = session?.kind === 'task' && session.taskId === task.id;
  const fmt = state.settings.timeFormat;
  const onDay = date ? blocksOnDate(task, date) : [];
  const onThisDay = onDay.length > 0;

  const toggle = () => {
    const previous = state;
    dispatch({ type: 'task/toggle', id: task.id });
    // Completed tasks that aren't on this day's timeline leave the list, so offer a way back.
    if (!done && date && !onThisDay) notify(`“${task.title}” completed`, previous);
  };

  const mainItems: MenuEntry[] = [
    { label: 'Edit details', icon: 'pencil', onSelect: () => openTask(task.id) },
    // A task can be scheduled many times, so this always adds another session.
    ...(onScheduleNext && !done
      ? [
          {
            label: onThisDay ? 'Add another session' : 'Schedule next free hour',
            icon: 'schedule' as const,
            onSelect: () => onScheduleNext(task),
          },
        ]
      : []),
    ...(onThisDay && date
      ? [
          {
            label: onDay.length > 1 ? `Remove from this day (${onDay.length})` : 'Remove from this day',
            icon: 'unschedule' as const,
            onSelect: () => {
              dispatch({ type: 'task/unschedule', id: task.id, date });
              announce(`${task.title} removed from this day`);
            },
          },
        ]
      : []),
    ...(task.blocks.length > onDay.length
      ? [
          {
            label: `Clear all time blocks (${task.blocks.length})`,
            icon: 'unschedule' as const,
            onSelect: () => {
              const previous = state;
              dispatch({ type: 'task/unschedule', id: task.id });
              notify(`All time blocks for “${task.title}” removed`, previous);
            },
          },
        ]
      : []),
    { label: 'Move to category…', icon: 'move', keepOpen: true, onSelect: () => setMenuView('move') },
    { kind: 'separator' },
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

  const moveItems: MenuEntry[] = [
    { label: 'Back', icon: 'chevronLeft', keepOpen: true, onSelect: () => setMenuView('main') },
    ...sortedGroups(state).flatMap<MenuEntry>((g) => [
      { kind: 'heading', label: g.name },
      ...categoriesInGroup(state, g.id).map<MenuEntry>((c) => ({
        label: c.name,
        swatch: c.color,
        checked: c.id === task.categoryId,
        onSelect: () => {
          if (c.id === task.categoryId) return;
          dispatch({ type: 'task/update', id: task.id, patch: { categoryId: c.id } });
          announce(`Moved to ${g.name} · ${c.name}`);
        },
      })),
    ]),
  ];

  // Today's first session (plus how many more), otherwise the next upcoming one.
  const upcoming = date ? nextBlock(task, date) : undefined;
  const chip = onThisDay
    ? {
        label: `${formatClock(onDay[0].startMin, fmt)}${onDay.length > 1 ? ` +${onDay.length - 1}` : ''}`,
        full: `Scheduled ${onDay.map((b) => formatRange(b.startMin, b.durationMin, fmt)).join(', ')}`,
      }
    : upcoming
      ? {
          label: formatShortDate(upcoming.date),
          full: `Next session ${formatShortDate(upcoming.date)}, ${formatRange(upcoming.startMin, upcoming.durationMin, fmt)}`,
        }
      : null;

  return (
    <li
      className={`${styles.taskRow} ${done ? styles.taskDone : ''} ${dragging ? styles.taskDragging : ''}`}
      // The completion toggle, name field and menu stop propagation, so other presses can start a drag.
      onPointerDown={(e) => !editing && startTaskDrag(e, task)}
      data-draggable={!editing || undefined}
    >
      <CompleteToggle done={done} title={task.title} onToggle={toggle} />
      <InlineTitle
        task={task}
        className={styles.taskTitle}
        inputClassName={styles.titleInput}
        onEditingChange={setEditing}
      />
      {!editing && chip && (
        <span className={`${styles.scheduleChip} ${onThisDay ? styles.scheduleChipToday : ''}`} title={chip.full}>
          <Icon name={onThisDay ? 'clock' : 'calendar'} size={12} />
          <span className="visually-hidden">{chip.full}</span>
          <span aria-hidden="true">{chip.label}</span>
        </span>
      )}
      {!editing && !chip && task.due && !done && <span className={styles.due}>{formatDue(task.due)}</span>}
      <span
        className={styles.priority}
        data-priority={task.priority}
        role="img"
        aria-label={PRIORITY_LABEL[task.priority]}
        title={PRIORITY_LABEL[task.priority]}
      />
      <Menu
        label={`More options for ${task.title}`}
        items={menuView === 'main' ? mainItems : moveItems}
        onOpenChange={(open) => !open && setMenuView('main')}
        triggerClassName={styles.rowMenu}
      />
    </li>
  );
}

function formatDue(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return 'Overdue';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
