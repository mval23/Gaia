import { useState } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import {
  blocksOnDate,
  categoriesInGroup,
  categoryById,
  goalById,
  groupById,
  nextBlock,
  sortedGroups,
} from '../../store/selectors';
import { useDragActions, useDragSession } from '../../dnd/DragProvider';
import { useDayMoveItems } from '../../hooks/useDayMoveItems';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { formatShortDate } from '../../lib/dates';
import { formatClock, formatRange } from '../../lib/time';
import { CompleteToggle } from '../ui/CompleteToggle';
import { Icon } from '../ui/Icon';
import { ContextMenu, Menu, useContextMenu, type MenuEntry } from '../ui/Menu';
import { paint } from '../../lib/swatch';
import { InlineTitle } from './InlineTitle';
import styles from './tasks.module.css';

interface TaskRowProps {
  task: Task;
  /** The day the list is showing; used for the schedule chip and completion behaviour. */
  date?: string;
  onScheduleNext?: (task: Task) => void;
  /** Show which group and category it belongs to, for the flat Today list. */
  showContext?: boolean;
}

const PRIORITY_LABEL = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' } as const;

export function TaskRow({ task, date, onScheduleNext, showContext }: TaskRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { startTaskDrag } = useDragActions();
  const session = useDragSession();
  const { openTask } = useTaskEditor();
  const dayMoveItems = useDayMoveItems(task, date);
  const contextMenu = useContextMenu();
  const [menuView, setMenuView] = useState<'main' | 'move'>('main');
  const [editing, setEditing] = useState(false);
  const done = task.status === 'done';
  const dragging = session?.kind === 'task' && session.taskId === task.id;
  const fmt = state.settings.timeFormat;
  const onDay = date ? blocksOnDate(task, date) : [];
  const onThisDay = onDay.length > 0;
  const category = showContext ? categoryById(state, task.categoryId) : undefined;
  const group = category ? groupById(state, category.groupId) : undefined;
  // After a few moves, the task itself hints that it may need a different shape.
  const keepsMoving = (task.plannedMoves ?? 0) >= 3;
  const goal = goalById(state, task.goalId);

  const toggle = () => {
    const previous = state;
    dispatch({ type: 'task/toggle', id: task.id });
    // Completed tasks that aren't on this day's timeline leave the list, so offer a way back.
    if (!done && date && !onThisDay) notify(`“${task.title}” completed`, previous);
  };

  const mainItems: MenuEntry[] = [
    ...(dayMoveItems.length ? [...dayMoveItems, { kind: 'separator' as const }] : []),
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
    ...(date && task.plannedFor !== date && !done
      ? [
          {
            label: 'Plan for this day',
            icon: 'plan' as const,
            onSelect: () => {
              dispatch({ type: 'task/plan', id: task.id, date });
              announce(`${task.title} is on today's list`);
            },
          },
        ]
      : []),
    ...(task.plannedFor
      ? [
          {
            label: 'Move back to Later',
            icon: 'arrowDown' as const,
            onSelect: () => {
              dispatch({ type: 'task/plan', id: task.id, date: undefined });
              announce(`${task.title} will wait under Later`);
            },
          },
        ]
      : []),
    { label: 'Move to category…', icon: 'move', keepOpen: true, onSelect: () => setMenuView('move') },
    { kind: 'separator' },
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
        swatch: paint(c.color),
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
      // On touch, holding opens the right-click menu, and moving on from the hold drags, as on iPadOS.
      onPointerDown={(e) => !editing && startTaskDrag(e, task, { open: contextMenu.openAt, close: contextMenu.close })}
      data-draggable={!editing || undefined}
      onContextMenu={editing ? undefined : contextMenu.onContextMenu}
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
      {!editing && goal && <span className={styles.goalChip}>{goal.title}</span>}
      {!editing && showContext && category && (
        <span className={styles.rowContext}>
          <span className={styles.contextDot} style={{ background: paint(category.color) }} aria-hidden="true" />
          <span className={styles.contextName}>{group ? `${group.name} · ${category.name}` : category.name}</span>
        </span>
      )}
      {!editing && keepsMoving && (
        <span className={styles.movesChip} title="This one keeps moving. It might need a different shape, a different day, or to be let go.">
          keeps moving
        </span>
      )}
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
      <ContextMenu
        label={`Options for ${task.title}`}
        items={menuView === 'main' ? mainItems : moveItems}
        point={contextMenu.point}
        onClose={() => {
          contextMenu.close();
          setMenuView('main');
        }}
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
  // Never 'overdue': a date that has passed is information, not a verdict.
  if (diff < 0) return `Was due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
