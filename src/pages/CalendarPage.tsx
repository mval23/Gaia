import { useEffect, useId, useMemo, useRef } from 'react';
import { useGaia } from '../store/GaiaProvider';
import { blocksByDate, categoryById, type ScheduledBlock } from '../store/selectors';
import { useMoveBlockDay } from '../hooks/useMoveBlockDay';
import { useDateParam, useParam, useSetParams } from '../hooks/useDateParam';
import { useTaskEditor } from '../hooks/useTaskEditor';
import { useDragActions } from '../dnd/DragProvider';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatMonthYear,
  fromISODate,
  monthGrid,
  weekDates,
  weekdayName,
} from '../lib/dates';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import { TimeGrid } from '../components/timeline/TimeGrid';
import ui from '../components/ui/ui.module.css';
import styles from './CalendarPage.module.css';

type View = 'day' | 'week' | 'month';

export function CalendarPage() {
  const { state } = useGaia();
  const { openTask } = useTaskEditor();
  const { registerShiftTarget } = useDragActions();
  const { date, setDate, isToday, today } = useDateParam();
  const [viewRaw, setViewRaw] = useParam('view');
  const setParams = useSetParams();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const requested: View = viewRaw === 'day' || viewRaw === 'week' ? viewRaw : 'month';
  const view: View = isMobile && requested === 'week' ? 'day' : requested;
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const shiftId = useId();

  const step = (dir: -1 | 1) => {
    if (view === 'month') setDate(addMonths(date, dir));
    else if (view === 'week') setDate(addDays(date, 7 * dir));
    else setDate(addDays(date, dir));
  };

  useEffect(() => {
    if (view !== 'day') return;
    const cleanups: (() => void)[] = [];
    if (prevRef.current)
      cleanups.push(registerShiftTarget(`${shiftId}-p`, { el: prevRef.current, onShift: () => setDate(addDays(date, -1)) }));
    if (nextRef.current)
      cleanups.push(registerShiftTarget(`${shiftId}-n`, { el: nextRef.current, onShift: () => setDate(addDays(date, 1)) }));
    return () => cleanups.forEach((c) => c());
  }, [view, date, setDate, registerShiftTarget, shiftId]);

  const dates = view === 'week' ? weekDates(date) : [date];
  const byDate = useMemo(() => blocksByDate(state), [state]);
  const moveDay = useMoveBlockDay();

  const openDay = (d: string) => setParams({ date: d === today ? null : d, view: 'day' });

  const heading = view === 'day' ? formatLongDate(date) : formatMonthYear(date);
  const stepLabel = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{heading}</h1>
          <div className={styles.nav}>
            <button ref={prevRef} type="button" className={ui.roundButton} aria-label={`Previous ${stepLabel}`} onClick={() => step(-1)}>
              <Icon name="chevronLeft" size={18} />
            </button>
            <button ref={nextRef} type="button" className={ui.roundButton} aria-label={`Next ${stepLabel}`} onClick={() => step(1)}>
              <Icon name="chevronRight" size={18} />
            </button>
            <button
              type="button"
              className={ui.pillButton}
              onClick={() => setDate(today)}
              aria-disabled={isToday}
              data-muted={isToday || undefined}
            >
              Today
            </button>
          </div>
          <MonetAccent art="liliesStrip" variant="strip" phrase="let the day unfold" className={styles.accent} />
        </div>
        <SegmentedControl<View>
          label="Calendar view"
          value={view}
          options={[
            { value: 'day', label: 'Day' },
            ...(isMobile ? [] : [{ value: 'week' as const, label: 'Week' }]),
            { value: 'month', label: 'Month' },
          ]}
          onChange={(v) => setViewRaw(v === 'month' ? null : v)}
        />
      </header>

      {view === 'month' ? (
        <MonthGrid
          date={date}
          today={today}
          blocksByDate={byDate}
          onPick={openDay}
        />
      ) : (
        <section className={styles.timePanel} aria-label={view === 'week' ? 'Week' : 'Day'}>
          <TimeGrid
            label={view === 'week' ? `Week of ${formatLongDate(dates[0])}` : `Timeline for ${formatLongDate(date)}`}
            dates={dates}
            blocksByDate={byDate}
            onOpenTask={openTask}
            onMoveDay={moveDay}
            header={
              view === 'week'
                ? (d) => (
                    <button
                      type="button"
                      className={`${styles.weekDay} ${d === today ? styles.weekDayToday : ''}`}
                      onClick={() => openDay(d)}
                      aria-label={`Open ${formatLongDate(d)}`}
                    >
                      <span>{weekdayName(d, 'short')}</span>
                      <strong>{fromISODate(d).getDate()}</strong>
                    </button>
                  )
                : undefined
            }
          />
        </section>
      )}
    </div>
  );
}

interface MonthGridProps {
  date: string;
  today: string;
  blocksByDate: Map<string, ScheduledBlock[]>;
  onPick: (date: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MonthGrid({ date, today, blocksByDate, onPick }: MonthGridProps) {
  const { state } = useGaia();
  const cells = monthGrid(date);

  return (
    <section className={styles.monthPanel} aria-label={formatMonthYear(date)}>
      <div className={styles.monthHead} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className={styles.month} style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
        {cells.map(({ date: d, inMonth }) => {
          const items = blocksByDate.get(d) ?? [];
          const shown = items.slice(0, 4);
          return (
            <button
              key={d}
              type="button"
              className={`${styles.cell} ${inMonth ? '' : styles.cellOut} ${d === today ? styles.cellToday : ''} ${d === date ? styles.cellSelected : ''}`}
              onClick={() => onPick(d)}
              aria-label={`${formatLongDate(d)}${items.length ? `, ${items.length} scheduled` : ''}`}
              aria-current={d === today ? 'date' : undefined}
            >
              <span className={styles.cellNum}>{fromISODate(d).getDate()}</span>
              {items.length > 0 && (
                <>
                  <span className={styles.dots} aria-hidden="true">
                    {shown.map(({ task: t, block }) => (
                      <span key={block.id} className={styles.dotItem} style={{ background: categoryById(state, t.categoryId)?.color }} />
                    ))}
                    {items.length > shown.length && <span className={styles.more}>+{items.length - shown.length}</span>}
                  </span>
                  <span className={styles.cellTasks} aria-hidden="true">
                    {items.slice(0, 2).map(({ task: t, block }) => (
                      <span key={block.id} className={`${styles.cellTask} ${t.status === 'done' ? styles.cellTaskDone : ''}`}>
                        <span className={styles.dotItem} style={{ background: categoryById(state, t.categoryId)?.color }} />
                        {t.title}
                      </span>
                    ))}
                    {items.length > 2 && <span className={styles.more}>+{items.length - 2} more</span>}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
