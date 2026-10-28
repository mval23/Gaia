import type { KeyboardEvent, CSSProperties } from 'react';
import type { Habit, Schedule, Task, TimeBlock as Block } from '../../types';
import type { Placement } from '../../lib/layout';
import type { OutlookEvent } from '../../integrations/outlook/events';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, groupById, groupOfTask } from '../../store/selectors';
import { HOUR_PX, useDragActions } from '../../dnd/DragProvider';
import { DAY_MIN, MIN_DURATION, SNAP_MIN, formatClock, formatDuration, formatRange } from '../../lib/time';
import { useDayMoveItems } from '../../hooks/useDayMoveItems';
import { joinMenuGroups, useTaskMenuParts } from '../../hooks/useTaskMenuParts';
import { CompleteToggle } from '../ui/CompleteToggle';
import { Icon } from '../ui/Icon';
import { ContextMenu, useContextMenu } from '../ui/Menu';
import { paint } from '../../lib/swatch';
import styles from './timeline.module.css';

interface TimeBlockProps {
  task: Task;
  /** The session this block draws; a task may have several. */
  block: Block;
  placement: Placement;
  dimmed: boolean;
  onOpen: () => void;
  onMoveDay?: (taskId: string, blockId: string, delta: number) => void;
}

function blockStyle(schedule: Schedule, placement: Placement, color?: string): CSSProperties {
  const top = (schedule.startMin / 60) * HOUR_PX;
  // Leave a hairline between back-to-back sessions so they read as two things.
  const height = Math.max((schedule.durationMin / 60) * HOUR_PX - 2, 18);
  const width = 100 / placement.lanes;
  return {
    top,
    height,
    left: `calc(${placement.lane * width}% + 4px)`,
    width: `calc(${width}% - 8px)`,
    ['--cat' as string]: paint(color) ?? 'var(--swatch-mist)',
  };
}

export function TimeBlock({ task, block, placement, dimmed, onOpen, onMoveDay }: TimeBlockProps) {
  const { state, dispatch } = useGaia();
  const { announce, notify } = useFeedback();
  const { startBlockDrag } = useDragActions();
  const schedule: Schedule = block;
  const sessionIndex = task.blocks.findIndex((b) => b.id === block.id);
  const sessionLabel = task.blocks.length > 1 ? `, session ${sessionIndex + 1} of ${task.blocks.length}` : '';
  const category = categoryById(state, task.categoryId);
  const group = groupOfTask(state, task);
  const fmt = state.settings.timeFormat;
  const done = task.status === 'done';
  const essential = task.essentialFor === block.date;
  const compact = schedule.durationMin < 45;
  const range = formatRange(schedule.startMin, schedule.durationMin, fmt);
  const dayMoveItems = useDayMoveItems(task, block.date, block);
  const parts = useTaskMenuParts(task, block.date);
  const contextMenu = useContextMenu();

  const toggle = () => {
    dispatch({ type: 'task/toggle', id: task.id, nextId: uid('t') });
    announce(done ? `${task.title} marked not done` : `${task.title} completed`);
  };

  const update = (next: Schedule, message: string) => {
    dispatch({ type: 'block/update', taskId: task.id, blockId: block.id, schedule: next });
    announce(message);
  };

  // A session shrunk to the smallest slot the grid holds: the errand that needs
  // a place in the day, not a share of it. Undoable, since it drops the plan.
  const makeQuick = () => {
    const previous = state;
    dispatch({
      type: 'block/update',
      taskId: task.id,
      blockId: block.id,
      schedule: { date: block.date, startMin: schedule.startMin, durationMin: MIN_DURATION },
    });
    notify(`“${task.title}” is now ${formatDuration(MIN_DURATION)}`, previous);
  };

  // The same order as a task's row: the day first, then this session and the task's
  // details, then the ways a task ends. Unschedule here removes only this session.
  const tomorrowItems = dayMoveItems.filter((item) => 'icon' in item && item.icon === 'arrowRight');
  const unscheduleItems = dayMoveItems.filter((item) => !tomorrowItems.includes(item));
  const menuItems = joinMenuGroups([
    [...parts.essential, ...tomorrowItems, ...parts.plan],
    [
      {
        label: 'Quick task',
        icon: 'clock',
        disabled: schedule.durationMin === MIN_DURATION,
        onSelect: makeQuick,
      },
      ...unscheduleItems,
      { label: 'Edit details', icon: 'pencil', onSelect: onOpen },
      { label: done ? 'Mark not done' : 'Complete', icon: 'check', onSelect: toggle },
    ],
    parts.end,
  ]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const { startMin, durationMin } = schedule;
    if (e.key === 'Enter') {
      e.preventDefault();
      onOpen();
    } else if (e.key === ' ') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      dispatch({ type: 'block/remove', taskId: task.id, blockId: block.id });
      announce(`${task.title}: time block removed`);
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey) {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      if (e.shiftKey) {
        const d = Math.min(DAY_MIN - startMin, Math.max(MIN_DURATION, durationMin + dir * SNAP_MIN));
        update({ date: block.date, startMin, durationMin: d }, `Duration ${formatDuration(d)}`);
      } else {
        const s = Math.min(DAY_MIN - durationMin, Math.max(0, startMin + dir * SNAP_MIN));
        update({ date: block.date, startMin: s, durationMin }, `Moved to ${formatRange(s, durationMin, fmt)}`);
      }
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.altKey && onMoveDay) {
      e.preventDefault();
      onMoveDay(task.id, block.id, e.key === 'ArrowLeft' ? -1 : 1);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.block} ${compact ? styles.blockCompact : ''} ${done ? styles.blockDone : ''} ${dimmed ? styles.blockDimmed : ''}`}
      style={blockStyle(schedule, placement, category?.color)}
      aria-label={`${task.title}${essential ? ', the one that matters' : ''}, ${range}, ${group?.name ?? ''} · ${category?.name ?? ''}${sessionLabel}${done ? ', completed' : ''}`}
      aria-describedby="block-help"
      // On touch, holding opens the right-click menu and moving on from the hold drags, like task rows.
      onPointerDown={(e) =>
        startBlockDrag(e, task, block, 'move', onOpen, { open: contextMenu.openAt, close: contextMenu.close })
      }
      onKeyDown={onKeyDown}
      onContextMenu={contextMenu.onContextMenu}
    >
      <div
        className={`${styles.handle} ${styles.handleTop}`}
        onPointerDown={(e) => startBlockDrag(e, task, block, 'resize-top')}
        aria-hidden="true"
      />
      <CompleteToggle
        size="sm"
        done={done}
        title={task.title}
        onToggle={toggle}
      />
      <div className={styles.blockText}>
        <span className={styles.blockTitle} title={task.title}>
          {essential && <Icon name="star" size={12} className={styles.blockStar} />}
          {task.title}
        </span>
        <span className={styles.blockMeta}>
          {range} · {formatDuration(schedule.durationMin)}
        </span>
      </div>
      <div
        className={`${styles.handle} ${styles.handleBottom}`}
        onPointerDown={(e) => startBlockDrag(e, task, block, 'resize-bottom')}
        aria-hidden="true"
      />
      <ContextMenu
        label={`Options for ${task.title}`}
        items={menuItems}
        point={contextMenu.point}
        onClose={contextMenu.close}
      />
    </div>
  );
}

export function PreviewBlock({ task, schedule }: { task: Task; schedule: Schedule }) {
  const { state } = useGaia();
  const category = categoryById(state, task.categoryId);
  return (
    <div
      className={`${styles.block} ${styles.blockPreview} ${schedule.durationMin < 45 ? styles.blockCompact : ''}`}
      style={blockStyle(schedule, { lane: 0, lanes: 1 }, category?.color)}
      aria-hidden="true"
    >
      <div className={styles.blockText}>
        <span className={styles.blockTitle}>{task.title}</span>
        <span className={styles.blockMeta}>
          {formatRange(schedule.startMin, schedule.durationMin, state.settings.timeFormat)} ·{' '}
          {formatDuration(schedule.durationMin)}
        </span>
      </div>
    </div>
  );
}

export function HabitPreviewBlock({ habit, schedule }: { habit: Habit; schedule: Schedule }) {
  const { state } = useGaia();
  const category = categoryById(state, habit.categoryId);
  return (
    <div
      className={`${styles.block} ${styles.blockSuggested} ${styles.blockPreview} ${schedule.durationMin < 45 ? styles.blockCompact : ''}`}
      style={blockStyle(schedule, { lane: 0, lanes: 1 }, category?.color)}
      aria-hidden="true"
    >
      <div className={styles.blockText}>
        <span className={styles.blockTitle}>{habit.title}</span>
        <span className={styles.blockMeta}>
          {formatRange(schedule.startMin, schedule.durationMin, state.settings.timeFormat)} ·{' '}
          {formatDuration(schedule.durationMin)}
        </span>
      </div>
    </div>
  );
}

export function BlockHelp() {
  return (
    <p id="block-help" className="visually-hidden">
      Drag to move, drag the top or bottom edge to change duration. With the keyboard: Enter to edit, Space to
      complete, arrow keys to move by 15 minutes, Shift plus arrow keys to change duration, Alt plus left or right
      arrow to move to another day, Delete to remove this time block.
    </p>
  );
}

/**
 * A habit's hour on the timeline, drawn unfilled: its usual time while it is
 * only a suggestion, and firmer once this day has been given a time of its own.
 * Dragging or resizing it writes that one day, so the habit's own time — and
 * every other day — stays exactly as it was. It is never counted as planned
 * time: a day is not full because a habit is in it.
 */
export function SuggestedBlock({
  habit,
  date,
  startMin,
  durationMin,
  placed,
  placement,
  logged,
  onOpen,
  onLog,
}: {
  habit: Habit;
  date: string;
  startMin: number;
  durationMin: number;
  /** This day has a time of its own for it, rather than the habit's usual one. */
  placed: boolean;
  placement: Placement;
  logged: boolean;
  onOpen: () => void;
  onLog: () => void;
}) {
  const { state, dispatch } = useGaia();
  const { announce, notify } = useFeedback();
  const { startHabitDrag } = useDragActions();
  const contextMenu = useContextMenu();
  const category = categoryById(state, habit.categoryId);
  const fmt = state.settings.timeFormat;
  const schedule: Schedule = { date, startMin, durationMin };
  const range = formatRange(startMin, durationMin, fmt);
  const usual = habit.preferredStartMin !== undefined;
  const label = `${habit.title}, ${placed ? `${range}, on this day only` : `suggested around ${formatClock(startMin, fmt)}`}, ${
    logged ? 'logged today' : 'not logged yet'
  }`;

  const place = (next: Schedule, message: string) => {
    dispatch({ type: 'habitTime/set', habitId: habit.id, schedule: next });
    announce(message);
  };

  /** Back to the habit's usual time, or off this day when it has no usual time. */
  const backToUsual = () => {
    const previous = state;
    dispatch({ type: 'habitTime/clear', habitId: habit.id, date });
    notify(
      usual
        ? `${habit.title} is back to its usual time. Only this day changed.`
        : `${habit.title} taken off this day. Its rhythm is untouched.`,
      previous,
    );
  };

  /** What today turned out to be, kept as how it usually goes from now on. */
  const makeUsual = () => {
    const previous = state;
    dispatch({ type: 'habit/update', id: habit.id, patch: { preferredStartMin: startMin, preferredDurationMin: durationMin } });
    dispatch({ type: 'habitTime/clear', habitId: habit.id, date });
    notify(`${habit.title} usually happens ${formatClock(startMin, fmt)} now.`, previous);
  };

  const menuItems = [
    { label: logged ? 'Mark as not logged' : 'Log it as done', icon: 'check' as const, onSelect: onLog },
    { label: 'Edit habit', icon: 'pencil' as const, onSelect: onOpen },
    ...(placed
      ? [
          { kind: 'separator' as const },
          { label: usual ? 'Back to its usual time' : 'Take it off this day', icon: 'repeat' as const, onSelect: backToUsual },
          { label: 'Make this its usual time', icon: 'clock' as const, onSelect: makeUsual },
        ]
      : []),
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onOpen();
    } else if (e.key === ' ') {
      e.preventDefault();
      onLog();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && placed) {
      e.preventDefault();
      backToUsual();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? -1 : 1;
      if (e.shiftKey) {
        const d = Math.min(DAY_MIN - startMin, Math.max(MIN_DURATION, durationMin + dir * SNAP_MIN));
        place({ ...schedule, durationMin: d }, `${habit.title}: ${formatDuration(d)} on this day`);
      } else {
        const s = Math.min(DAY_MIN - durationMin, Math.max(0, startMin + dir * SNAP_MIN));
        place({ ...schedule, startMin: s }, `${habit.title}: ${formatRange(s, durationMin, fmt)} on this day`);
      }
    }
  };

  return (
    <div
      className={`${styles.block} ${styles.blockSuggested} ${durationMin < 45 ? styles.blockCompact : ''}`}
      style={blockStyle(schedule, placement, category?.color)}
      data-suggested="true"
      data-placed={placed || undefined}
      data-logged={logged || undefined}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-describedby="habit-block-help"
      title={label}
      onPointerDown={(e) =>
        startHabitDrag(e, habit, schedule, 'move', onOpen, { open: contextMenu.openAt, close: contextMenu.close })
      }
      onKeyDown={onKeyDown}
      onContextMenu={contextMenu.onContextMenu}
    >
      <div
        className={`${styles.handle} ${styles.handleTop}`}
        onPointerDown={(e) => startHabitDrag(e, habit, schedule, 'resize-top')}
        aria-hidden="true"
      />
      <div className={styles.blockText}>
        <span className={styles.blockTitle}>{habit.title}</span>
        <span className={styles.blockMeta}>
          {logged ? 'logged' : placed ? `${range} · ${formatDuration(durationMin)}` : formatClock(startMin, fmt)}
        </span>
      </div>
      <div
        className={`${styles.handle} ${styles.handleBottom}`}
        onPointerDown={(e) => startHabitDrag(e, habit, schedule, 'resize-bottom')}
        aria-hidden="true"
      />
      <ContextMenu
        label={`Options for ${habit.title}`}
        items={menuItems}
        point={contextMenu.point}
        onClose={contextMenu.close}
      />
    </div>
  );
}

export function HabitBlockHelp() {
  return (
    <p id="habit-block-help" className="visually-hidden">
      Drag to move this habit on this day only, or drag its top or bottom edge to change how long it takes. With the
      keyboard: Enter to edit the habit, Space to log it, arrow keys to move by 15 minutes, Shift plus arrow keys to
      change the length, Delete to put it back at its usual time. Its usual time, and every other day, stay as they are.
    </p>
  );
}

/**
 * A meeting from a linked Outlook calendar. It belongs to Outlook, so it can't
 * be dragged or edited here; opening it goes to the event in Outlook.
 */
export function OutlookBlock({ event, placement }: { event: OutlookEvent; placement: Placement }) {
  const { state } = useGaia();
  const group = groupById(state, event.groupId);
  const fmt = state.settings.timeFormat;
  const range = formatRange(event.startMin, event.durationMin, fmt);
  const open = () => {
    if (event.webLink) window.open(event.webLink, '_blank', 'noopener');
  };

  return (
    <div
      className={`${styles.block} ${styles.blockOutlook} ${event.durationMin < 45 ? styles.blockCompact : ''}`}
      style={blockStyle(event, placement, group?.color)}
      role="button"
      tabIndex={0}
      aria-label={`${event.subject}, ${range}, Outlook event in ${group?.name ?? 'a linked calendar'}`}
      title={`${event.subject} · ${range} · Outlook`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className={styles.blockText}>
        <span className={styles.blockTitle}>{event.subject}</span>
        <span className={styles.blockMeta}>{range} · Outlook</span>
      </div>
    </div>
  );
}
