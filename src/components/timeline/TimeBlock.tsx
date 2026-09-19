import type { KeyboardEvent, CSSProperties } from 'react';
import type { Habit, Schedule, Task, TimeBlock as Block } from '../../types';
import type { Placement } from '../../lib/layout';
import type { OutlookEvent } from '../../integrations/outlook/events';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, groupById, groupOfTask } from '../../store/selectors';
import { HOUR_PX, useDragActions } from '../../dnd/DragProvider';
import { DAY_MIN, MIN_DURATION, SNAP_MIN, formatClock, formatDuration, formatRange } from '../../lib/time';
import { useDayMoveItems } from '../../hooks/useDayMoveItems';
import { CompleteToggle } from '../ui/CompleteToggle';
import { Icon } from '../ui/Icon';
import { ContextMenu, useContextMenu, type MenuEntry } from '../ui/Menu';
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
  const contextMenu = useContextMenu();

  const toggle = () => {
    dispatch({ type: 'task/toggle', id: task.id });
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

  const menuItems: MenuEntry[] = [
    ...dayMoveItems,
    {
      label: 'Quick task',
      icon: 'clock',
      disabled: schedule.durationMin === MIN_DURATION,
      onSelect: makeQuick,
    },
    { kind: 'separator' },
    { label: 'Edit details', icon: 'pencil', onSelect: onOpen },
    { label: done ? 'Mark not done' : 'Complete', icon: 'check', onSelect: toggle },
  ];

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
        onToggle={() => dispatch({ type: 'task/toggle', id: task.id })}
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
 * A habit's preferred time, drawn dashed and unfilled. It is a suggestion, so
 * it is never counted as planned time and cannot be dragged: moving a habit's
 * hour belongs in its editor, not in a moment of rearranging the day.
 */
export function SuggestedBlock({
  habit,
  startMin,
  durationMin,
  placement,
  logged,
  onOpen,
  onLog,
}: {
  habit: Habit;
  startMin: number;
  durationMin: number;
  placement: Placement;
  logged: boolean;
  onOpen: () => void;
  onLog: () => void;
}) {
  const { state } = useGaia();
  const category = categoryById(state, habit.categoryId);
  const fmt = state.settings.timeFormat;
  const label = `${habit.title}, suggested around ${formatClock(startMin, fmt)}, ${
    logged ? 'logged today' : 'not logged yet'
  }`;

  return (
    <div
      className={`${styles.block} ${styles.blockSuggested} ${durationMin < 45 ? styles.blockCompact : ''}`}
      style={blockStyle({ date: '', startMin, durationMin }, placement, category?.color)}
      data-suggested="true"
      data-logged={logged || undefined}
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
        } else if (e.key === ' ') {
          e.preventDefault();
          onLog();
        }
      }}
    >
      <div className={styles.blockText}>
        <span className={styles.blockTitle}>{habit.title}</span>
        <span className={styles.blockMeta}>{logged ? 'logged' : formatClock(startMin, fmt)}</span>
      </div>
    </div>
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
