import { useState } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { blocksOnDate } from '../../store/selectors';
import { addDays, formatShortDate } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { formatRange } from '../../lib/time';
import { Icon } from '../ui/Icon';
import { DatePickerButton } from '../ui/DatePickerButton';
import styles from './plan.module.css';

interface Props {
  tasks: Task[];
  date: string;
}

/**
 * An end-of-day pass over what did not happen. Every option is a real choice,
 * including letting something go, and the whole card can simply be dismissed.
 */
export function CloseDayCard({ tasks, date }: Props) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const [dismissed, setDismissed] = useState(false);

  const unfinished = tasks.filter((t) => t.status === 'open');
  const pastBlocks = tasks
    .filter((t) => t.status === 'open')
    .flatMap((task) => blocksOnDate(task, date).map((block) => ({ task, block })));

  if (dismissed || unfinished.length === 0) return null;

  const move = (task: Task, to: string | undefined, said: string) => {
    dispatch({ type: 'task/plan', id: task.id, date: to });
    if (to === undefined) dispatch({ type: 'task/unschedule', id: task.id, date });
    announce(`${task.title}: ${said}`);
  };

  return (
    <section className={styles.closeCard} aria-labelledby="close-day-title">
      <div className={styles.closeHead}>
        <h2 id="close-day-title" className={styles.closeTitle}>
          Closing the day
        </h2>
        <button type="button" className={styles.closeButton} onClick={() => setDismissed(true)}>
          Not now
        </button>
      </div>
      <p className={styles.closeIntro}>{COPY.closeDay}</p>

      <ul className={styles.closeList}>
        {unfinished.map((task) => {
          const blocks = blocksOnDate(task, date);
          return (
            <li key={task.id} className={styles.closeItem}>
              <p className={styles.closeItemTitle}>
                {task.title}
                {blocks.length > 0 && (
                  <span className={styles.closeItemMeta}>
                    {' · '}
                    {formatRange(blocks[0].startMin, blocks[0].durationMin, state.settings.timeFormat)}
                  </span>
                )}
              </p>
              <div className={styles.closeActions}>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => move(task, addDays(date, 1), 'tomorrow')}
                >
                  Tomorrow
                </button>
                <button type="button" className={styles.closeButton} onClick={() => move(task, undefined, 'moved to Later')}>
                  Later
                </button>
                <DatePickerButton
                  value={date}
                  onChange={(picked) => move(task, picked, `moved to ${formatShortDate(picked)}`)}
                />
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => {
                    const previous = state;
                    dispatch({ type: 'task/update', id: task.id, patch: { status: 'let-go' } });
                    dispatch({ type: 'task/unschedule', id: task.id });
                    notify(`Let go. “${task.title}” is still in your history.`, previous);
                  }}
                >
                  Let it go
                </button>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => {
                    dispatch({ type: 'task/toggle', id: task.id });
                    announce(`${task.title}: done`);
                  }}
                >
                  <Icon name="check" size={14} /> It happened
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {pastBlocks.length > 0 && <p className={styles.closeIntro}>{COPY.closeDayBlocks}</p>}
    </section>
  );
}
