import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Task } from '../types';
import { uid, useFeedback, useGaia } from '../store/GaiaProvider';
import { useMoveBlockDay } from '../hooks/useMoveBlockDay';
import {
  GROUP_ALL,
  categoriesInGroup,
  compareDayList,
  inDayList,
  groupParamValue,
  resolveGroupParam,
  blocksOn,
  sortedGroups,
} from '../store/selectors';
import { useDateParam, useParam } from '../hooks/useDateParam';
import { useTaskEditor } from '../hooks/useTaskEditor';
import { useDragActions } from '../dnd/DragProvider';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { addDays, formatLongDate, fromISODate, relativeDayLabel } from '../lib/dates';
import { findFreeSlot } from '../lib/layout';
import { formatDuration, formatRange, nowMinutes, summarizeDay } from '../lib/time';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { DatePickerButton } from '../components/ui/DatePickerButton';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import { GroupSection } from '../components/tasks/GroupSection';
import { CategoryCard } from '../components/tasks/CategoryCard';
import { TimeGrid } from '../components/timeline/TimeGrid';
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
  const { registerShiftTarget, registerUnscheduleZone } = useDragActions();
  const { date, setDate, isToday, today } = useDateParam();
  const [groupRaw, setGroupRaw] = useParam('group');
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
  const groups = sortedGroups(state);
  const visibleGroups = groupFilter === GROUP_ALL ? groups : groups.filter((g) => g.id === groupFilter);

  const blocks = useMemo(() => blocksOn(state, date, groupFilter), [state, date, groupFilter]);
  const summary = {
    ...summarizeDay(
      blocks.map(({ block }) => block.durationMin),
      (settings.dayEndHour - settings.dayStartHour) * 60,
    ),
    // A task scheduled twice today still counts as one task.
    tasks: new Set(blocks.map(({ task }) => task.id)).size,
  };
  const blocksByDate = useMemo(() => new Map([[date, blocks]]), [date, blocks]);
  const moveDay = useMoveBlockDay();

  const listFor = useCallback(
    (categoryId: string) =>
      state.tasks
        .filter((t) => t.categoryId === categoryId && inDayList(t, date))
        .sort((a, b) => compareDayList(a, b, date)),
    [state.tasks, date],
  );

  const activeTotal = visibleGroups.reduce(
    (n, g) =>
      n + categoriesInGroup(state, g.id).reduce((m, c) => m + listFor(c.id).filter((t) => t.status === 'open').length, 0),
    0,
  );

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

  const scheduleNext = (task: Task) => {
    const busy = blocksOn(state, date).map(({ block }) => block);
    const from = isToday ? Math.max(settings.dayStartHour * 60, nowMinutes()) : settings.dayStartHour * 60;
    const until = settings.dayEndHour * 60;
    for (const duration of [60, 30, 15]) {
      const start = findFreeSlot(busy, duration, from, until);
      if (start !== null) {
        dispatch({
          type: 'block/add',
          taskId: task.id,
          block: { id: uid('b'), date, startMin: start, durationMin: duration },
        });
        notify(`“${task.title}” scheduled ${formatRange(start, duration, fmt)}`);
        return;
      }
    }
    notify(`No free time left on ${relativeDayLabel(date).toLowerCase()}`);
  };

  const groupOptions = [
    { value: GROUP_ALL, label: 'All' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

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
        </div>

        <div className={styles.controls}>
          <SegmentedControl
            label="Filter by group"
            options={groupOptions}
            value={groupFilter}
            onChange={(v) => setGroupRaw(groupParamValue(state, v))}
            className={styles.groupFilter}
          />
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
          </div>
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
              <strong>{formatDuration(summary.freeMin)}</strong> free
            </span>
          </p>
        </div>
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

      <div
        ref={workspaceRef}
        className={styles.workspace}
        style={{ ['--split' as string]: split }}
      >
        <section
          ref={tasksPanelRef}
          id="plan-tasks-panel"
          className={`${styles.panel} ${styles.panelPlain}`}
          aria-labelledby="tasks-panel-title"
          hidden={isMobile && mobilePanel !== 'tasks'}
        >
          <div className={styles.panelHeader}>
            <h2 id="tasks-panel-title" className="eyebrow">
              Tasks
            </h2>
            <span className={styles.panelMeta}>{activeTotal} active</span>
          </div>
          <div className={styles.panelScroll}>
            {visibleGroups.map((group) => {
              const cats = categoriesInGroup(state, group.id);
              const groupActive = cats.reduce((n, c) => n + listFor(c.id).filter((t) => t.status === 'open').length, 0);
              return (
                <GroupSection
                  key={group.id}
                  group={group}
                  activeCount={groupActive}
                  showHeader={groupFilter === GROUP_ALL}
                >
                  {cats.length === 0 ? (
                    <p className={styles.emptyGroup}>No categories in {group.name} yet. Add one in Manage.</p>
                  ) : (
                    cats.map((cat) => (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        group={group}
                        tasks={listFor(cat.id)}
                        date={date}
                        onScheduleNext={scheduleNext}
                      />
                    ))
                  )}
                </GroupSection>
              );
            })}
            {activeTotal === 0 ? (
              <div className={styles.emptyState}>
                <MonetAccent art="gardenCard" variant="card" phrase="everything has a place. leave space." />
              </div>
            ) : (
              <MonetAccent art="liliesTile" phrase="begin gently" className={styles.listAccent} />
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

        <section
          className={styles.panel}
          aria-labelledby="day-panel-title"
          hidden={isMobile && mobilePanel !== 'day'}
        >
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
              onOpenTask={openTask}
              onMoveDay={moveDay}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
