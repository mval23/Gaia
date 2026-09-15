import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGaia } from '../../store/GaiaProvider';
import type { ScheduledBlock } from '../../store/selectors';
import { HOUR_PX, useDragActions, useDragSession } from '../../dnd/DragProvider';
import { layoutLanes } from '../../lib/layout';
import { formatClock, nowMinutes } from '../../lib/time';
import { todayISO } from '../../lib/dates';
import { TimeBlock, PreviewBlock } from './TimeBlock';
import styles from './timeline.module.css';

interface TimeGridProps {
  dates: string[];
  blocksByDate: Map<string, ScheduledBlock[]>;
  onOpenTask: (id: string) => void;
  onMoveDay?: (taskId: string, blockId: string, delta: number) => void;
  header?: (date: string) => ReactNode;
  label: string;
  className?: string;
}

function useNow() {
  const [now, setNow] = useState(() => ({ date: todayISO(), min: nowMinutes() }));
  useEffect(() => {
    const id = window.setInterval(() => setNow({ date: todayISO(), min: nowMinutes() }), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function TimeGrid({ dates, blocksByDate, onOpenTask, onMoveDay, header, label, className }: TimeGridProps) {
  const { state } = useGaia();
  const { settings } = state;
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const didScroll = useRef(false);

  // Start the view near the current time (or the start of the waking day). If the grid is
  // mounted hidden (e.g. the mobile Day tab), wait until it has a size.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || didScroll.current) return;
    const apply = () => {
      if (didScroll.current || el.clientHeight === 0) return;
      didScroll.current = true;
      const target = dates.includes(now.date)
        ? Math.max(settings.dayStartHour * 60, now.min - 90)
        : settings.dayStartHour * 60;
      el.scrollTop = (target / 60) * HOUR_PX;
    };
    apply();
    if (didScroll.current) return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dates, now.date, now.min, settings.dayStartHour]);


  return (
    <div className={`${styles.gridWrap} ${className ?? ''}`}>
      <div ref={scrollRef} className={styles.scroller} data-scroll-y role="region" aria-label={label} tabIndex={-1}>
        {header && (
          <div className={styles.weekHeader}>
            <div className={styles.gutterSpacer} />
            {dates.map((d) => (
              <div key={d} className={styles.weekHeaderCell}>
                {header(d)}
              </div>
            ))}
          </div>
        )}
        <div className={styles.canvas} style={{ height: 24 * HOUR_PX }}>
          <div className={styles.gutter} aria-hidden="true">
            {HOURS.map((h) => (
              <span
                key={h}
                // Waking hours are emphasised through the labels, not a background band.
                className={`${styles.hourLabel} ${h < settings.dayStartHour || h > settings.dayEndHour ? styles.hourLabelQuiet : ''}`}
                style={{ top: h * HOUR_PX }}
              >
                {h === 0 ? '' : formatClock(h * 60, settings.timeFormat)}
              </span>
            ))}
            {dates.includes(now.date) && (
              <span className={styles.nowLabel} style={{ top: (now.min / 60) * HOUR_PX }}>
                {formatClock(now.min, settings.timeFormat)}
              </span>
            )}
          </div>
          <div className={styles.columns}>
            <div className={styles.lines} aria-hidden="true">
              {HOURS.map((h) => (
                <div key={h} className={styles.hourLine} style={{ top: h * HOUR_PX, height: HOUR_PX }} />
              ))}
            </div>
            {dates.map((date) => (
              <DayColumn
                key={date}
                date={date}
                items={blocksByDate.get(date) ?? []}
                onOpenTask={onOpenTask}
                onMoveDay={onMoveDay}
                nowMin={date === now.date ? now.min : null}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DayColumnProps {
  date: string;
  items: ScheduledBlock[];
  onOpenTask: (id: string) => void;
  onMoveDay?: (taskId: string, blockId: string, delta: number) => void;
  nowMin: number | null;
}

function DayColumn({ date, items, onOpenTask, onMoveDay, nowMin }: DayColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const { registerColumn } = useDragActions();
  const session = useDragSession();
  const { state } = useGaia();

  useEffect(() => {
    if (!ref.current) return;
    return registerColumn(id, { date, el: ref.current });
  }, [id, date, registerColumn]);

  const placements = useMemo(
    () =>
      layoutLanes(
        items.map(({ block }) => ({ id: block.id, startMin: block.startMin, durationMin: block.durationMin })),
      ),
    [items],
  );

  const preview = session?.preview?.date === date ? session.preview : null;
  const previewTask = preview ? state.tasks.find((t) => t.id === session!.taskId) : undefined;

  return (
    <div
      ref={ref}
      className={styles.dayColumn}
      data-drop-active={session?.preview?.date === date ? 'true' : undefined}
    >
      {items.map(({ task, block }) => (
        <TimeBlock
          key={block.id}
          task={task}
          block={block}
          placement={placements.get(block.id) ?? { lane: 0, lanes: 1 }}
          dimmed={session?.blockId === block.id}
          onOpen={() => onOpenTask(task.id)}
          onMoveDay={onMoveDay}
        />
      ))}
      {preview && previewTask && <PreviewBlock task={previewTask} schedule={preview} />}
      {nowMin !== null && (
        <div className={styles.nowLine} style={{ top: (nowMin / 60) * HOUR_PX }} aria-hidden="true">
          <span className={styles.nowDot} />
        </div>
      )}
    </div>
  );
}
