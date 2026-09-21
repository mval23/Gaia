import { useState, type ReactNode } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { blocksOnDate, categoryById, goalById, groupById, nextBlock } from '../../store/selectors';
import { useDragActions, useDragSession } from '../../dnd/DragProvider';
import { useDayMoveItems } from '../../hooks/useDayMoveItems';
import { joinMenuGroups, useTaskMenuParts } from '../../hooks/useTaskMenuParts';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { addDays, formatShortDate, sinceLabel, todayISO } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { formatClock, formatRange } from '../../lib/time';
import { CompleteToggle } from '../ui/CompleteToggle';
import { DatePickerButton } from '../ui/DatePickerButton';
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
  /** An extra control before the menu, such as the Inbox's Sort. */
  action?: ReactNode;
}

export function TaskRow({ task, date, onScheduleNext, showContext, essential, action }: TaskRowProps) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { startTaskDrag } = useDragActions();
  const session = useDragSession();
  const { openTask } = useTaskEditor();
  const dayMoveItems = useDayMoveItems(task, date);
  const parts = useTaskMenuParts(task, date);
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

  // The calendar beside each task: choose the day it is for. Moving it off the day
  // being shown clears its sessions there, as "Tomorrow" does.
  const planFor = (picked: string) => {
    if (picked === task.plannedFor && (!date || picked === date)) return;
    const previous = state;
    if (date && picked !== date) dispatch({ type: 'task/unschedule', id: task.id, date });
    dispatch({ type: 'task/plan', id: task.id, date: picked });
    const today = todayISO();
    const when =
      picked === today ? 'today' : picked === addDays(today, 1) ? 'tomorrow' : formatShortDate(picked);
    notify(`“${task.title}” planned for ${when}`, previous);
  };
  const canPlan = task.status === 'open';

  // "Tomorrow" leads the day items; Unschedule sits with the other time changes.
  const tomorrowItems = dayMoveItems.filter((item) => 'icon' in item && item.icon === 'arrowRight');
  const unscheduleItems = dayMoveItems.filter((item) => !tomorrowItems.includes(item));

  // Three groups at most, as Apple's context-menu guidance asks: which day it belongs to,
  // then its time and details, then the ways a task ends, with Delete last.
  const dayItems: MenuEntry[] = [...parts.essential, ...tomorrowItems, ...parts.plan];

  const timeItems: MenuEntry[] = [
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
    ...unscheduleItems,
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

  const menuItems = joinMenuGroups([dayItems, timeItems, parts.end]);

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
      {action}
      {canPlan ? (
        <DatePickerButton
          compact
          value={task.plannedFor ?? date ?? todayISO()}
          onChange={planFor}
          label={`Plan “${task.title}” for a day`}
          title={task.plannedFor ? `Planned for ${formatShortDate(task.plannedFor)}` : 'Plan for a day'}
          className={`${styles.planButton} ${task.plannedFor ? styles.planButtonSet : ''}`}
        />
      ) : (
        <span className={styles.planSpacer} aria-hidden="true" />
      )}
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
