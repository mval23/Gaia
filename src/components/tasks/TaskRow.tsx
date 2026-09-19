import { useState } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { blocksOnDate, categoryById, goalById, groupById, nextBlock } from '../../store/selectors';
import { useDragActions, useDragSession } from '../../dnd/DragProvider';
import { useDayMoveItems } from '../../hooks/useDayMoveItems';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { formatShortDate, sinceLabel, todayISO } from '../../lib/dates';
import { COPY } from '../../lib/copy';
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
  /** Drawn larger, as "the one that matters" on this day. */
  essential?: boolean;
}

const PRIORITY_LABEL = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' } as const;

export function TaskRow({ task, date, onScheduleNext, showContext, essential }: TaskRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { startTaskDrag } = useDragActions();
  const session = useDragSession();
  const { openTask } = useTaskEditor();
  const dayMoveItems = useDayMoveItems(task, date);
  const contextMenu = useContextMenu();
  const [editing, setEditing] = useState(false);
  const done = task.status === 'done';
  const withSomeone = task.status === 'waiting';
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

  // Three groups at most, as Apple's context-menu guidance asks: time first, then the plan, then
  // the ways a task ends, with Delete last. Category and clearing every session live in Edit details.
  const timeItems: MenuEntry[] = [
    ...dayMoveItems,
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
  ];

  const planItems: MenuEntry[] = [
    ...(date && !done && !withSomeone
      ? [
          task.essentialFor === date
            ? {
                label: 'Not the one today',
                icon: 'star' as const,
                onSelect: () => {
                  dispatch({ type: 'task/essential', id: task.id, date: undefined });
                  announce(`${task.title} is back in the list`);
                },
              }
            : {
                label: 'Make it the one that matters',
                icon: 'star' as const,
                onSelect: () => {
                  dispatch({ type: 'task/essential', id: task.id, date });
                  announce(`${task.title} is the one that matters today`);
                },
              },
        ]
      : []),
    ...(date && task.plannedFor !== date && !done && !withSomeone
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
    { label: 'Edit details', icon: 'pencil', onSelect: () => openTask(task.id) },
  ];

  const endItems: MenuEntry[] = [
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

  const menuItems: MenuEntry[] = [timeItems, planItems, endItems]
    .filter((group) => group.length > 0)
    .flatMap((group, i) => (i === 0 ? group : [{ kind: 'separator' as const }, ...group]));

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

  // Chips and context. The one that matters gives them a line of their own under the title.
  const meta = (
    <>
      {!editing && chip && (
        <span className={`${styles.scheduleChip} ${onThisDay ? styles.scheduleChipToday : ''}`} title={chip.full}>
          <Icon name={onThisDay ? 'clock' : 'calendar'} size={12} />
          <span className="visually-hidden">{chip.full}</span>
          <span aria-hidden="true">{chip.label}</span>
        </span>
      )}
      {!editing && !chip && task.due && !done && <span className={styles.due}>{formatDue(task.due)}</span>}
      {!editing && withSomeone && (
        <span className={styles.withChip}>
          {task.waitingOn?.trim() ? `${task.waitingOn.trim()} has it` : COPY.withSomeone}
          {task.waitingSince ? ` · ${sinceLabel(task.waitingSince, date ?? todayISO())}` : ''}
        </span>
      )}
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
    </>
  );

  return (
    <li
      className={`${styles.taskRow} ${done ? styles.taskDone : ''} ${dragging ? styles.taskDragging : ''} ${essential ? styles.taskEssential : ''}`}
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
      {essential ? <span className={styles.essentialMeta}>{meta}</span> : meta}
      <span
        className={styles.priority}
        data-priority={task.priority}
        role="img"
        aria-label={PRIORITY_LABEL[task.priority]}
        title={PRIORITY_LABEL[task.priority]}
      />
      <Menu
        label={`More options for ${task.title}`}
        items={menuItems}
        triggerClassName={styles.rowMenu}
      />
      <ContextMenu
        label={`Options for ${task.title}`}
        items={menuItems}
        point={contextMenu.point}
        onClose={contextMenu.close}
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
