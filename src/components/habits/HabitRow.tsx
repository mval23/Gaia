import { useState } from 'react';
import type { CheckInKind, Habit } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, checkInKey, goalById, isQuiet, weekCount } from '../../store/selectors';
import { rhythmLabel, weeklyTarget } from '../../lib/rhythm';
import { formatClock } from '../../lib/time';
import { Menu } from '../ui/Menu';
import { CheckInControl } from './CheckInControl';
import styles from './habits.module.css';

interface Props {
  habit: Habit;
  date: string;
  log: Map<string, CheckInKind>;
  /** On a gentle day, only the tiny version is offered. */
  gentle?: boolean;
  onEdit: (id: string) => void;
}

/**
 * One habit, as a card.
 *
 * The shape follows the two reference images: a coloured top edge for identity
 * (the "border idea"), then name, then the quiet detail, then the pattern of
 * recent days, and the logging controls last — the one thing you came to do,
 * always in the same place.
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
  const aimMet = thisWeek >= target;

  const setKind = (kind: CheckInKind) => {
    dispatch({ type: 'checkin/set', habitId: habit.id, date, kind });
    const said = kind === 'done' ? 'logged' : kind === 'tiny' ? 'tiny counts, logged' : 'rest day noted';
    announce(`${habit.title}: ${said}`);
  };

  const clear = () => {
    dispatch({ type: 'checkin/clear', habitId: habit.id, date });
    announce(`${habit.title}: cleared for this day`);
  };

  // The quiet detail line: what it is attached to, when it happens, how often.
  const detail = [
    gentle && habit.tinyVersion ? habit.tinyVersion : habit.cue,
    rhythmLabel(habit.rhythm),
    habit.preferredStartMin !== undefined ? `around ${formatClock(habit.preferredStartMin, settings.timeFormat)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={styles.card}
      data-logged={value ?? undefined}
      // The top edge carries the category colour, so the card itself stays calm.
      style={{ ['--cat' as string]: category?.color ?? 'var(--border-strong)' }}
    >
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{habit.title}</h3>
        <Menu
          label={`More options for ${habit.title}`}
          triggerClassName={styles.cardMenu}
          items={[
            { label: 'Edit habit', icon: 'pencil', onSelect: () => onEdit(habit.id) },
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
      </div>

      {(goal || detail) && (
        <p className={styles.detail}>
          {goal && <span className={styles.goalChip}>{goal.title}</span>}
          {detail}
        </p>
      )}

      {!settings.hideNumbers && !gentle && (
        <p className={styles.tally}>
          <span className={aimMet ? styles.aimMet : undefined}>
            {aimMet
              ? 'That is your week'
              : `${thisWeek} of ${habit.rhythm.type === 'timesPerWeek' ? `about ${target}` : target} this week`}
          </span>
        </p>
      )}
      <CheckInControl
        title={habit.title}
        value={value}
        tinyVersion={habit.tinyVersion}
        onSet={setKind}
        onClear={clear}
      />

      {quiet && (
        <div className={styles.quiet}>
          <p>This rhythm hasn’t found its place lately. That happens.</p>
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
