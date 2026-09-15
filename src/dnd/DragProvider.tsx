import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Schedule, Task, TimeBlock } from '../types';
import { uid, useFeedback, useGaia } from '../store/GaiaProvider';
import { categoryById } from '../store/selectors';
import { DAY_MIN, MIN_DURATION, SNAP_MIN, clamp, formatDuration, formatRange, snap } from '../lib/time';
import { formatShortDate } from '../lib/dates';
import styles from './drag.module.css';

export const HOUR_PX = 64;
const THRESHOLD = 4;
const SHIFT_DELAY = 600;
const SHIFT_REPEAT = 900;
const DEFAULT_DURATION = 60;

export type DragKind = 'task' | 'move' | 'resize-top' | 'resize-bottom';

export interface DragSession {
  kind: DragKind;
  taskId: string;
  /** Set when an existing time block is being moved or resized. */
  blockId?: string;
  preview: Schedule | null;
  overUnschedule: boolean;
}

interface Column {
  date: string;
  el: HTMLElement;
}

interface ShiftTarget {
  el: HTMLElement;
  onShift: () => void;
}

interface DragActions {
  startTaskDrag: (e: ReactPointerEvent, task: Task, onTap?: () => void) => void;
  startBlockDrag: (
    e: ReactPointerEvent,
    task: Task,
    block: TimeBlock,
    kind: Exclude<DragKind, 'task'>,
    onTap?: () => void,
  ) => void;
  registerColumn: (id: string, column: Column) => () => void;
  registerShiftTarget: (id: string, target: ShiftTarget) => () => void;
  registerUnscheduleZone: (id: string, el: HTMLElement) => () => void;
}

const ActionsContext = createContext<DragActions | null>(null);
const SessionContext = createContext<DragSession | null>(null);

interface Pending {
  kind: DragKind;
  task: Task;
  startX: number;
  startY: number;
  pointerId: number;
  active: boolean;
  grabOffsetMin: number;
  /** The session being moved or resized; absent when a task is dragged in from the list. */
  block?: TimeBlock;
  onTap?: () => void;
  x: number;
  y: number;
  hoverShift?: { id: string; since: number; lastFired: number };
}

function within(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>('[data-scroll-y]');
}

export function DragProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const [session, setSession] = useState<DragSession | null>(null);
  const columns = useRef(new Map<string, Column>());
  const shiftTargets = useRef(new Map<string, ShiftTarget>());
  const unscheduleZones = useRef(new Map<string, HTMLElement>());
  const pending = useRef<Pending | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const timer = useRef(0);
  const sessionRef = useRef<DragSession | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commitSession = (next: DragSession | null) => {
    const prev = sessionRef.current;
    if (
      prev &&
      next &&
      prev.kind === next.kind &&
      prev.overUnschedule === next.overUnschedule &&
      prev.preview?.date === next.preview?.date &&
      prev.preview?.startMin === next.preview?.startMin &&
      prev.preview?.durationMin === next.preview?.durationMin
    ) {
      return;
    }
    sessionRef.current = next;
    setSession(next);
  };

  const columnAt = (x: number, y: number): Column | null => {
    for (const col of columns.current.values()) {
      if (within(col.el, x, y)) {
        const scroller = scrollParent(col.el);
        if (!scroller || within(scroller, x, y)) return col;
      }
    }
    return null;
  };

  const columnForDate = (date: string): Column | null => {
    for (const col of columns.current.values()) if (col.date === date) return col;
    return null;
  };

  const minutesAt = (col: Column, y: number) => ((y - col.el.getBoundingClientRect().top) / HOUR_PX) * 60;

  const computeSession = (p: Pending): DragSession => {
    const base = { kind: p.kind, taskId: p.task.id, blockId: p.block?.id };
    if (p.kind === 'move' || p.kind === 'task') {
      const overUnschedule =
        p.kind === 'move' && [...unscheduleZones.current.values()].some((el) => within(el, p.x, p.y));
      if (overUnschedule) return { ...base, preview: null, overUnschedule: true };
      const col = columnAt(p.x, p.y);
      if (!col) return { ...base, preview: null, overUnschedule: false };
      const duration = p.block?.durationMin ?? DEFAULT_DURATION;
      const raw = minutesAt(col, p.y) - p.grabOffsetMin;
      const startMin = clamp(
        p.kind === 'task' ? Math.floor(raw / SNAP_MIN) * SNAP_MIN : snap(raw),
        0,
        DAY_MIN - duration,
      );
      return { ...base, preview: { date: col.date, startMin, durationMin: duration }, overUnschedule: false };
    }
    // Resizing stays on the block's own day.
    const b = p.block!;
    const origin: Schedule = { date: b.date, startMin: b.startMin, durationMin: b.durationMin };
    const col = columnForDate(origin.date);
    if (!col) return { ...base, preview: origin, overUnschedule: false };
    const pointerMin = snap(minutesAt(col, p.y));
    const end = origin.startMin + origin.durationMin;
    if (p.kind === 'resize-bottom') {
      const newEnd = clamp(pointerMin, origin.startMin + MIN_DURATION, DAY_MIN);
      return { ...base, preview: { ...origin, durationMin: newEnd - origin.startMin }, overUnschedule: false };
    }
    const newStart = clamp(pointerMin, 0, end - MIN_DURATION);
    return { ...base, preview: { ...origin, startMin: newStart, durationMin: end - newStart }, overUnschedule: false };
  };

  /** Drag logic: day-shift hover and the snapped preview. Runs on pointer moves and on a timer. */
  const evaluate = () => {
    const p = pending.current;
    if (!p || !p.active) return;
    const now = performance.now();

    // Hovering a day-shift target moves the dragged item to another day.
    if (p.kind === 'move' || p.kind === 'task') {
      let hovered: string | null = null;
      for (const [id, t] of shiftTargets.current) if (within(t.el, p.x, p.y)) hovered = id;
      for (const [id, t] of shiftTargets.current) t.el.dataset.dropHover = String(id === hovered);
      if (!hovered) p.hoverShift = undefined;
      else if (!p.hoverShift || p.hoverShift.id !== hovered) p.hoverShift = { id: hovered, since: now, lastFired: 0 };
      else {
        const elapsed = now - p.hoverShift.since;
        const due = p.hoverShift.lastFired ? now - p.hoverShift.lastFired > SHIFT_REPEAT : elapsed > SHIFT_DELAY;
        if (due) {
          p.hoverShift.lastFired = now;
          shiftTargets.current.get(hovered)?.onShift();
        }
      }
    }

    commitSession(computeSession(p));
  };

  /** Visual loop: edge auto-scroll and pointer-following overlays. */
  const paint = () => {
    const p = pending.current;
    if (!p || !p.active) return;

    const col = p.kind.startsWith('resize') ? columnForDate(p.block!.date) : columnAt(p.x, p.y);
    const scroller = col ? scrollParent(col.el) : null;
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      const edge = 48;
      const before = scroller.scrollTop;
      if (p.y < r.top + edge) scroller.scrollTop -= Math.ceil((r.top + edge - p.y) / 4);
      else if (p.y > r.bottom - edge) scroller.scrollTop += Math.ceil((p.y - (r.bottom - edge)) / 4);
      if (scroller.scrollTop !== before) commitSession(computeSession(p));
    }

    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${p.x + 14}px, ${p.y + 10}px, 0)`;
    }
    if (readoutRef.current) {
      readoutRef.current.style.transform = `translate3d(${p.x + 16}px, ${p.y - 46}px, 0)`;
    }
    frame.current = requestAnimationFrame(() => handlers.current.paint());
  };

  const finish = (commit: boolean) => {
    const p = pending.current;
    pending.current = null;
    cancelAnimationFrame(frame.current);
    window.clearInterval(timer.current);
    document.body.classList.remove('is-dragging', 'is-resizing');
    for (const t of shiftTargets.current.values()) delete t.el.dataset.dropHover;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey, true);

    if (!p) return;
    if (!p.active) {
      if (commit) p.onTap?.();
      commitSession(null);
      return;
    }
    const final = computeSession(p);
    commitSession(null);
    if (!commit) {
      announce('Drag cancelled');
      return;
    }
    const title = p.task.title;
    if (final.overUnschedule && p.block) {
      dispatch({ type: 'block/remove', taskId: p.task.id, blockId: p.block.id });
      announce(`${title}: time block removed`);
    } else if (final.preview) {
      // Dragging a task from the list always adds another session; dragging a block moves that block.
      if (p.block) {
        dispatch({ type: 'block/update', taskId: p.task.id, blockId: p.block.id, schedule: final.preview });
      } else {
        dispatch({ type: 'block/add', taskId: p.task.id, block: { id: uid('b'), ...final.preview } });
      }
      const fmt = stateRef.current.settings.timeFormat;
      announce(
        `${title} scheduled ${formatShortDate(final.preview.date)}, ${formatRange(final.preview.startMin, final.preview.durationMin, fmt)}`,
      );
    }
  };

  // Listeners are stable function identities stored in refs so add/remove match.
  const handlers = useRef({
    move: (_e: PointerEvent) => {},
    up: (_e: PointerEvent) => {},
    cancel: (_e: PointerEvent) => {},
    key: (_e: KeyboardEvent) => {},
    paint: () => {},
    evaluate: () => {},
  });
  handlers.current.paint = paint;
  handlers.current.evaluate = evaluate;
  handlers.current.move = (e) => {
    const p = pending.current;
    if (!p || e.pointerId !== p.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.active && Math.hypot(p.x - p.startX, p.y - p.startY) > THRESHOLD) {
      p.active = true;
      document.body.classList.add(p.kind.startsWith('resize') ? 'is-resizing' : 'is-dragging');
      (document.activeElement as HTMLElement | null)?.blur?.();
      frame.current = requestAnimationFrame(() => handlers.current.paint());
      timer.current = window.setInterval(() => handlers.current.evaluate(), 100);
    }
    if (p.active) {
      e.preventDefault();
      evaluate();
    }
  };
  handlers.current.up = (e) => {
    if (pending.current && e.pointerId === pending.current.pointerId) finish(true);
  };
  handlers.current.cancel = () => finish(false);
  handlers.current.key = (e) => {
    if (e.key === 'Escape' && pending.current?.active) {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  };
  const onMove = useRef((e: PointerEvent) => handlers.current.move(e)).current;
  const onUp = useRef((e: PointerEvent) => handlers.current.up(e)).current;
  const onCancel = useRef((e: PointerEvent) => handlers.current.cancel(e)).current;
  const onKey = useRef((e: KeyboardEvent) => handlers.current.key(e)).current;

  const begin = useCallback(
    (e: ReactPointerEvent, task: Task, kind: DragKind, block?: TimeBlock, onTap?: () => void) => {
      if (e.button !== 0 || pending.current) return;
      let grabOffsetMin = 0;
      if (kind === 'move' && block) {
        const col = columnForDate(block.date);
        if (col) grabOffsetMin = minutesAt(col, e.clientY) - block.startMin;
      }
      pending.current = {
        kind,
        task,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        active: false,
        grabOffsetMin,
        block,
        onTap,
      };
      if (kind !== 'task') e.stopPropagation();
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => finish(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = useMemo<DragActions>(
    () => ({
      startTaskDrag: (e, task, onTap) => {
        // Touch devices schedule from the task menu instead; keep native scrolling intact.
        if (e.pointerType === 'touch') return;
        begin(e, task, 'task', undefined, onTap);
      },
      startBlockDrag: (e, task, block, kind, onTap) => begin(e, task, kind, block, onTap),
      registerColumn: (id, column) => {
        columns.current.set(id, column);
        return () => columns.current.delete(id);
      },
      registerShiftTarget: (id, target) => {
        shiftTargets.current.set(id, target);
        return () => shiftTargets.current.delete(id);
      },
      registerUnscheduleZone: (id, el) => {
        unscheduleZones.current.set(id, el);
        return () => unscheduleZones.current.delete(id);
      },
    }),
    [begin],
  );

  const draggedTask = session ? state.tasks.find((t) => t.id === session.taskId) : undefined;
  const color = draggedTask ? categoryById(state, draggedTask.categoryId)?.color : undefined;
  const fmt = state.settings.timeFormat;
  const showGhost = session && (session.kind === 'task' || session.kind === 'move') && !session.preview;

  return (
    <ActionsContext.Provider value={actions}>
      <SessionContext.Provider value={session}>
        {children}
        {session &&
          createPortal(
            <>
              {showGhost && draggedTask && (
                <div ref={ghostRef} className={styles.ghost} style={{ ['--cat' as string]: color }}>
                  <span className={styles.ghostDot} />
                  {draggedTask.title}
                  {session.overUnschedule && <span className={styles.ghostHint}>Unschedule</span>}
                </div>
              )}
              {session.preview && (
                <div ref={readoutRef} className={styles.readout} role="presentation">
                  <strong>{formatRange(session.preview.startMin, session.preview.durationMin, fmt)}</strong>
                  <span>{formatDuration(session.preview.durationMin)}</span>
                </div>
              )}
            </>,
            document.body,
          )}
      </SessionContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useDragActions(): DragActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useDragActions must be used inside DragProvider');
  return ctx;
}

export function useDragSession(): DragSession | null {
  return useContext(SessionContext);
}
