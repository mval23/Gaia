import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Task } from '../types';
import { uid, useFeedback, useGaia } from '../store/GaiaProvider';
import { useMoveBlockDay } from '../hooks/useMoveBlockDay';
import { blocksOn, habitsForDate, partitionDay, resolveGroupParam } from '../store/selectors';
import { useDateParam, useParam } from '../hooks/useDateParam';
import { useTaskEditor } from '../hooks/useTaskEditor';
import { useHabitEditor } from '../hooks/useSheetParam';
import { useDragActions } from '../dnd/DragProvider';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { addDays, dayOfWeek, formatLongDate, fromISODate, relativeDayLabel } from '../lib/dates';
import { findFreeSlot } from '../lib/layout';
import { COPY, FULL_DAY_RATIO } from '../lib/copy';
import { formatDuration, formatRange, nowMinutes, summarizeDay } from '../lib/time';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { DatePickerButton } from '../components/ui/DatePickerButton';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import { RhythmsSection } from '../components/plan/RhythmsSection';
import { TodaySection } from '../components/plan/TodaySection';
import { LaterSection } from '../components/plan/LaterSection';
import { CalendarLinks } from '../components/plan/CalendarLinks';
import { WeeklyReflection } from '../components/plan/WeeklyReflection';
import { TimeGrid, type Suggestion } from '../components/timeline/TimeGrid';
import { useOutlookEvents } from '../integrations/outlook/OutlookProvider';
import { SplitHandle } from '../components/ui/SplitHandle';
import { useStoredNumber } from '../hooks/useStoredNumber';
import ui from '../components/ui/ui.module.css';
import styles from './TodayPage.module.css';

const SPLIT_KEY = 'gaia:ui:plan-split';
const SPLIT_DEFAULT = 42;
const SPLIT_MIN = 25;
const SPLIT_MAX = 65;

/** Small label above the date: Today / Tomorrow / Yesterday / In 3 days / 3 days ago. */
function dayEyebrow(date: string, today: string): string {
  const diff = Math.round((fromISODate(date).getTime() - fromISODate(today).getTime()) / 86_400_000);
  if (Math.abs(diff) <= 1) return relativeDayLabel(date);
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

export function TodayPage() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { openTask } = useTaskEditor();
  const { openHabit } = useHabitEditor();
  const { registerShiftTarget, registerUnscheduleZone } = useDragActions();
  const { date, setDate, isToday, today } = useDateParam();
  // Still read from the URL so a ?group= link keeps working, but no control here.
  const [groupRaw] = useParam('group');
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [mobilePanel, setMobilePanel] = useState<'tasks' | 'day'>('tasks');
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const tasksPanelRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useStoredNumber(SPLIT_KEY, SPLIT_DEFAULT);
  const shiftId = useId();
  const { settings } = state;
  const fmt = settings.timeFormat;

  const groupFilter = resolveGroupParam(state, groupRaw);

  // A gentle day belongs to one date, so tomorrow starts fresh.
  const gentle = settings.gentleDayDate === date;
  const hideNumbers = settings.hideNumbers || gentle;

  const blocks = useMemo(() => blocksOn(state, date, groupFilter), [state, date, groupFilter]);
  const windowMin = (settings.dayEndHour - settings.dayStartHour) * 60;
  const summary = {
    ...summarizeDay(
      blocks.map(({ block }) => block.durationMin),
      windowMin,
    ),
    // A task scheduled twice today still counts as one task.
    tasks: new Set(blocks.map(({ task }) => task.id)).size,
  };
  const full = windowMin > 0 && summary.plannedMin > windowMin * FULL_DAY_RATIO;
  const blocksByDate = useMemo(() => new Map([[date, blocks]]), [date, blocks]);
  const eventsByDate = useOutlookEvents([date], groupFilter);
  const moveDay = useMoveBlockDay();

  const { today: todayTasks, later: laterTasks } = useMemo(
    () => partitionDay(state, date, groupFilter),
    [state, date, groupFilter],
  );

  // Habits with a preferred time appear as dashed suggestions, never as commitments.
  const suggestionsByDate = useMemo(() => {
    const list: Suggestion[] = habitsForDate(state, date, groupFilter)
      .filter((habit) => habit.preferredStartMin !== undefined)
      .map((habit) => ({ habit, startMin: habit.preferredStartMin as number, durationMin: 30 }));
    return new Map([[date, list]]);
  }, [state, date, groupFilter]);

  // Day-shift drop targets: hovering prev/next while dragging moves to that day.
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    if (prevRef.current)
      cleanups.push(registerShiftTarget(`${shiftId}-prev`, { el: prevRef.current, onShift: () => setDate(addDays(date, -1)) }));
    if (nextRef.current)
      cleanups.push(registerShiftTarget(`${shiftId}-next`, { el: nextRef.current, onShift: () => setDate(addDays(date, 1)) }));
    return () => cleanups.forEach((c) => c());
  }, [date, setDate, registerShiftTarget, shiftId]);

  useEffect(() => {
    if (!tasksPanelRef.current) return;
    return registerUnscheduleZone(`${shiftId}-tasks`, tasksPanelRef.current);
  }, [registerUnscheduleZone, shiftId, isMobile, mobilePanel]);

  const scheduleNext = useCallback(
    (task: Task) => {
      const busy = blocksOn(state, date).map(({ block }) => block);
      const from = isToday ? Math.max(settings.dayStartHour * 60, nowMinutes()) : settings.dayStartHour * 60;
      const until = settings.dayEndHour * 60;
      for (const duration of [60, 30, 15]) {
        const start = findFreeSlot(busy, duration, from, until);
        if (start !== null) {
          dispatch({ type: 'block/add', taskId: task.id, block: { id: uid('b'), date, startMin: start, durationMin: duration } });
          // Scheduling something is also choosing it for this day.
          dispatch({ type: 'task/plan', id: task.id, date });
          notify(`“${task.title}” scheduled ${formatRange(start, duration, fmt)}`);
          return;
        }
      }
      notify(`No open time left on ${relativeDayLabel(date).toLowerCase()}`);
    },
    [state, date, isToday, settings.dayStartHour, settings.dayEndHour, dispatch, notify, fmt],
  );

  const showReflection = dayOfWeek(date) === settings.reflectionWeekday;

  return (
    <div className={styles.page}>
      {/* One line on desktop: date title · group filter · day arrows · date picker · summary */}
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>
            <Icon name="sparkle" size={14} />
            {dayEyebrow(date, today)}
          </p>
          <h1 className={styles.title}>
            <time dateTime={date}>{formatLongDate(date)}</time>
          </h1>
          <CalendarLinks date={date} />
        </div>

        <div className={styles.controls}>
          <div className={styles.dayNav}>
            <div className={styles.arrowPill} role="group" aria-label="Change day">
              <button
                ref={prevRef}
                type="button"
                className={styles.arrow}
                aria-label="Previous day"
                onClick={() => setDate(addDays(date, -1))}
              >
                <Icon name="chevronLeft" size={18} />
              </button>
              <button
                ref={nextRef}
                type="button"
                className={styles.arrow}
                aria-label="Next day"
                onClick={() => setDate(addDays(date, 1))}
              >
                <Icon name="chevronRight" size={18} />
              </button>
            </div>
            <DatePickerButton value={date} onChange={setDate} className={styles.calendarButton} />
            {!isToday && (
              <button type="button" className={`${ui.pillButton} ${styles.todayButton}`} onClick={() => setDate(today)}>
                Today
              </button>
            )}
            <button
              type="button"
              className={`${ui.pillButton} ${styles.gentleToggle}`}
              aria-pressed={gentle}
              title="Tiny versions only, and no figures"
              onClick={() =>
                dispatch({ type: 'settings/update', patch: { gentleDayDate: gentle ? undefined : date } })
              }
            >
              Gentle day
            </button>
          </div>
          {hideNumbers ? (
            <p className={styles.summary}>
              <span className="serif">{COPY.gentleDay}</span>
            </p>
          ) : (
            <p className={styles.summary} aria-label="Day summary">
              <span>
                <strong>{summary.tasks}</strong> {summary.tasks === 1 ? 'task' : 'tasks'}
              </span>
              <span className={styles.bullet} aria-hidden="true">
                •
              </span>
              <span>
                <strong>{formatDuration(summary.plannedMin)}</strong> planned
              </span>
              <span className={styles.bullet} aria-hidden="true">
                •
              </span>
              <span>
                <strong>{formatDuration(summary.freeMin)}</strong> open
              </span>
            </p>
          )}
        </div>
        {full && !hideNumbers && <p className={styles.fullNote}>{COPY.fullDay}</p>}
      </header>

      {isMobile && (
        <div className={styles.mobileSwitch}>
          <SegmentedControl
            size="sm"
            label="Show panel"
            options={[
              { value: 'tasks', label: 'Tasks' },
              { value: 'day', label: 'Day' },
            ]}
            value={mobilePanel}
            onChange={setMobilePanel}
          />
        </div>
      )}

      <div ref={workspaceRef} className={styles.workspace} style={{ ['--split' as string]: split }}>
        <section
          ref={tasksPanelRef}
          id="plan-tasks-panel"
          className={`${styles.panel} ${styles.panelPlain}`}
          aria-label="Rhythms and tasks"
          hidden={isMobile && mobilePanel !== 'tasks'}
        >
          <div className={styles.panelScroll}>
            <RhythmsSection date={date} groupFilter={groupFilter} gentle={gentle} />

            {showReflection && <WeeklyReflection date={date} />}

            <TodaySection
              tasks={todayTasks}
              date={date}
              gentle={gentle}
              hideNumbers={hideNumbers}
              onScheduleNext={scheduleNext}
            />

            <LaterSection
              tasks={laterTasks}
              date={date}
              groupFilter={groupFilter}
              hideNumbers={hideNumbers}
              onScheduleNext={scheduleNext}
            />

            {todayTasks.length === 0 && laterTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <MonetAccent art="garden" variant="card" phrase="room to begin." />
              </div>
            ) : (
              <MonetAccent art="iris" phrase="begin gently" className={styles.listAccent} />
            )}
          </div>
        </section>

        {!isMobile && (
          <SplitHandle
            containerRef={workspaceRef}
            value={split}
            min={SPLIT_MIN}
            max={SPLIT_MAX}
            defaultValue={SPLIT_DEFAULT}
            onChange={setSplit}
            label="Resize tasks and day panels"
            controls="plan-tasks-panel"
          />
        )}

        <section className={styles.panel} aria-labelledby="day-panel-title" hidden={isMobile && mobilePanel !== 'day'}>
          <div className={styles.panelHeader}>
            <h2 id="day-panel-title" className="eyebrow">
              Day
            </h2>
            <span className={styles.panelMeta}>
              {blocks.length === 0
                ? isMobile
                  ? 'Nothing planned yet'
                  : 'Nothing planned yet · drag a task here'
                : `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`}
            </span>
          </div>
          <div className={styles.timelineSurface}>
            <TimeGrid
              label={`Timeline for ${formatLongDate(date)}`}
              dates={[date]}
              blocksByDate={blocksByDate}
              suggestionsByDate={suggestionsByDate}
              eventsByDate={eventsByDate}
              onOpenTask={openTask}
              onOpenHabit={openHabit}
              onMoveDay={moveDay}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
