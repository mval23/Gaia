import { useState } from 'react';
import type { CheckInKind, Habit } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import {
  HABIT_DEFAULT_MIN,
  blocksOn,
  categoryById,
  checkInKey,
  goalById,
  habitTimeFor,
  isQuiet,
  isReturning,
  restsOn,
  valueById,
  weekCount,
} from '../../store/selectors';
import { rhythmLabel, weeklyTarget } from '../../lib/rhythm';
import { formatClock, formatRange, nowMinutes } from '../../lib/time';
import { findFreeSlot } from '../../lib/layout';
import { todayISO } from '../../lib/dates';
import { Menu } from '../ui/Menu';
import { paint } from '../../lib/swatch';
import { HabitToggle } from './HabitToggle';
import styles from './habits.module.css';

interface Props {
  habit: Habit;
  date: string;
  log: Map<string, CheckInKind>;
  /** On a gentle day, only the tiny version is offered. */
  gentle?: boolean;
  onEdit: (id: string) => void;
}

const LOGGED_WORD: Record<CheckInKind, string> = {
  done: 'done',
  tiny: 'tiny counts',
  rest: 'resting today',
};

/**
 * One habit in the day's panel. Until it is logged it shows what it is and how
 * the week is going; once logged it folds down to a single line, like a
 * finished task, and gets out of the way.
 */
export function HabitRow({ habit, date, log, gentle, onEdit }: Props) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const { settings } = state;

  const value = log.get(checkInKey(habit.id, date));
  const category = categoryById(state, habit.categoryId);
  const goal = goalById(state, habit.goalId);
  const target = weeklyTarget(habit.rhythm);
  const thisWeek = weekCount(state, habit.id, date);
  const quiet = !dismissedPrompt && isQuiet(state, habit, date);
  // After a few quiet days, the person's own words for coming back replace the cue.
  const returning = isReturning(state, habit, date);
  const comingBack = habit.comingBack?.trim();
  const why = habit.why?.trim();
  const aimMet = thisWeek >= target;

  const setKind = (kind: CheckInKind) => {
    dispatch({ type: 'checkin/set', habitId: habit.id, date, kind });
    announce(`${habit.title}: ${kind === 'tiny' ? 'tiny counts, logged' : kind === 'rest' ? 'rest day noted' : 'logged'}`);
  };

  const clear = () => {
    dispatch({ type: 'checkin/clear', habitId: habit.id, date });
    announce(`${habit.title}: cleared for this day`);
  };

  const placed = habitTimeFor(state, habit.id, date);

  /**
   * Gives the habit an hour on this day: its usual time if it has one, else the
   * first open slot. Only this day is written — its rhythm is untouched.
   */
  const placeToday = () => {
    const previous = state;
    const durationMin = habit.preferredDurationMin ?? HABIT_DEFAULT_MIN;
    const busy = [
      ...blocksOn(state, date).map(({ block }) => block),
      ...restsOn(state, date).map((r) => ({ startMin: r.startMin, durationMin: r.durationMin })),
    ];
    const earliest =
      habit.preferredStartMin ??
      Math.max(settings.dayStartHour * 60, date === todayISO() ? nowMinutes() : 0);
    const startMin = findFreeSlot(busy, durationMin, earliest, settings.dayEndHour * 60) ?? earliest;
    dispatch({ type: 'habitTime/set', habitId: habit.id, schedule: { date, startMin, durationMin } });
    notify(
      `${habit.title} is on this day at ${formatClock(startMin, settings.timeFormat)}. Drag it wherever it fits.`,
      previous,
    );
  };

  const backToUsual = () => {
    const previous = state;
    dispatch({ type: 'habitTime/clear', habitId: habit.id, date });
    notify(
      habit.preferredStartMin !== undefined
        ? `${habit.title} is back to its usual time.`
        : `${habit.title} taken off this day.`,
      previous,
    );
  };

  const detail = [
    returning ? comingBack : gentle && habit.tinyVersion ? habit.tinyVersion : habit.cue,
    rhythmLabel(habit.rhythm),
    // The day's own time wins over the usual one, because that is where it is today.
    placed
      ? formatRange(placed.startMin, placed.durationMin, settings.timeFormat)
      : habit.preferredStartMin !== undefined
        ? `around ${formatClock(habit.preferredStartMin, settings.timeFormat)}`
        : null,
    goal?.title,
    // Through its goal a habit already reaches a value, so the lens only shows
    // on a habit that belongs to no goal at all.
    goal ? null : valueById(state, habit.valueId)?.word,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={styles.card}
      data-kind={value ?? undefined}
      style={{ ['--cat' as string]: paint(category?.color) ?? 'var(--border-strong)' }}
    >
      <HabitToggle
        title={habit.title}
        value={value}
        tinyVersion={habit.tinyVersion}
        onSet={setKind}
        onClear={clear}
      />

      <div className={styles.body}>
        <p className={styles.title}>{habit.title}</p>
        {value ? (
          <p className={styles.detail}>{LOGGED_WORD[value]}</p>
        ) : (
          detail && <p className={styles.detail}>{detail}</p>
        )}
        {gentle && why && !value && <p className={styles.why}>{why}</p>}
      </div>

      {!value && !gentle && !settings.hideNumbers && (
        <p className={styles.tally}>
          {aimMet
            ? 'that is your week'
            : `${thisWeek} of ${habit.rhythm.type === 'timesPerWeek' ? `about ${target}` : target}`}
        </p>
      )}

      <Menu
        label={`More options for ${habit.title}`}
        triggerClassName={styles.cardMenu}
        items={[
          { label: 'Edit habit', icon: 'pencil', onSelect: () => onEdit(habit.id) },
          placed
            ? { label: 'Back to its usual time', icon: 'repeat' as const, onSelect: backToUsual }
            : { label: 'Give it a time on this day', icon: 'clock' as const, onSelect: placeToday },
          {
            label: 'Let it rest for now',
            icon: 'clock',
            onSelect: () => {
              dispatch({ type: 'habit/update', id: habit.id, patch: { status: 'paused' } });
              announce(`${habit.title} is resting`);
            },
          },
          { kind: 'separator' },
          {
            label: 'Delete habit',
            icon: 'trash',
            danger: true,
            onSelect: () => {
              const previous = state;
              dispatch({ type: 'habit/delete', id: habit.id });
              notify(`“${habit.title}” deleted, along with its history`, previous);
            },
          },
        ]}
      />

      {quiet && !value && (
        <div className={styles.quiet}>
          <p>{comingBack ? `Your note for coming back: “${comingBack}”` : 'This rhythm hasn’t found its place lately. That happens.'}</p>
          <div className={styles.quietActions}>
            <button
              type="button"
              className={styles.quietButton}
              onClick={() => {
                dispatch({ type: 'habit/update', id: habit.id, patch: { rhythm: { type: 'timesPerWeek', times: 1 } } });
                announce(`${habit.title} is now about once a week`);
              }}
            >
              Make it smaller
            </button>
            <button type="button" className={styles.quietButton} onClick={() => onEdit(habit.id)}>
              Change when
            </button>
            <button
              type="button"
              className={styles.quietButton}
              onClick={() => {
                dispatch({ type: 'habit/update', id: habit.id, patch: { status: 'paused' } });
                announce(`${habit.title} is resting`);
              }}
            >
              Pause it
            </button>
            <button type="button" className={styles.quietButton} onClick={() => setDismissedPrompt(true)}>
              Keep as is
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
