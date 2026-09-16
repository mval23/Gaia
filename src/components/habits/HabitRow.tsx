import { useState } from 'react';
import type { CheckInKind, Habit } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, checkInKey, goalById, isQuiet, weekCount } from '../../store/selectors';
import { rhythmLabel, weeklyTarget } from '../../lib/rhythm';
import { formatClock } from '../../lib/time';
import { Menu } from '../ui/Menu';
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
  const aimMet = thisWeek >= target;

  const setKind = (kind: CheckInKind) => {
    dispatch({ type: 'checkin/set', habitId: habit.id, date, kind });
    announce(`${habit.title}: ${kind === 'tiny' ? 'tiny counts, logged' : kind === 'rest' ? 'rest day noted' : 'logged'}`);
  };

  const clear = () => {
    dispatch({ type: 'checkin/clear', habitId: habit.id, date });
    announce(`${habit.title}: cleared for this day`);
  };

  const detail = [
    gentle && habit.tinyVersion ? habit.tinyVersion : habit.cue,
    rhythmLabel(habit.rhythm),
    habit.preferredStartMin !== undefined ? `around ${formatClock(habit.preferredStartMin, settings.timeFormat)}` : null,
    goal?.title,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={styles.card}
      data-kind={value ?? undefined}
      style={{ ['--cat' as string]: category?.color ?? 'var(--border-strong)' }}
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
