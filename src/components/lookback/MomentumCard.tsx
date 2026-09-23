import type { Goal, Momentum, Snag } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { goalCheckIn, habitsForGoal } from '../../store/selectors';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { useHabitEditor } from '../../hooks/useSheetParam';
import { COPY, MOMENTUM_NOTE, MOMENTUM_WORD, SNAG_OFFER, SNAG_WORD } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './lookback.module.css';

const MOMENTUMS: Momentum[] = ['moving', 'steady', 'snagged', 'resting'];
const SNAGS: Snag[] = ['clarity', 'time', 'energy', 'setup'];

/**
 * One word for each active goal, asked once a week, and only here. It is the
 * person's own reading: nothing is calculated, and a week can be skipped.
 */
export function MomentumCard({ weekStart, date }: { weekStart: string; date: string }) {
  const { state } = useGaia();
  const goals = state.goals.filter((g) => g.status === 'active');
  if (goals.length === 0) return null;

  return (
    <section className={styles.card} aria-labelledby="momentum-title">
      <div className={styles.cardHead}>
        <h2 id="momentum-title" className="eyebrow">
          Your goals
        </h2>
        <span className={styles.meta}>one word each</span>
      </div>
      {goals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} weekStart={weekStart} date={date} />
      ))}
    </section>
  );
}

function GoalRow({ goal, weekStart, date }: { goal: Goal; weekStart: string; date: string }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openTask } = useTaskEditor();
  const { openHabit } = useHabitEditor();
  const entry = goalCheckIn(state, goal.id, weekStart);
  const habit = habitsForGoal(state, goal.id).find((h) => h.status === 'active');

  const set = (momentum: Momentum, snag?: Snag) => {
    dispatch({ type: 'goalCheckIn/set', goalId: goal.id, date: weekStart, momentum, snag, note: entry?.note });
    announce(`${goal.title}: ${MOMENTUM_WORD[momentum].toLowerCase()}`);
  };

  /** Each snag points at one small change, and the button makes exactly that change. */
  const takeOffer = () => {
    if (!entry?.snag) return;
    if (entry.snag === 'energy' || entry.snag === 'setup') {
      if (habit) {
        openHabit(habit.id);
        return;
      }
    }
    const id = uid('t');
    const title = entry.snag === 'time' ? `Time for ${goal.title}` : `Next step for ${goal.title}`;
    dispatch({ type: 'task/add', id, title, plannedFor: entry.snag === 'time' ? date : undefined });
    dispatch({ type: 'task/update', id, patch: { goalId: goal.id } });
    notify(`“${title}” is in your Inbox. Give it your own words.`);
    openTask(id);
  };

  return (
    <div className={styles.goal}>
      <p className={styles.goalTitle}>
        <Icon name="goal" size={15} />
        {goal.title}
      </p>
      <div className={styles.picks} role="group" aria-label={`${COPY.momentumQuestion} ${goal.title}`}>
        {MOMENTUMS.map((momentum) => (
          <button
            key={momentum}
            type="button"
            className={styles.pick}
            data-momentum={momentum}
            aria-pressed={entry?.momentum === momentum}
            onClick={() =>
              entry?.momentum === momentum
                ? dispatch({ type: 'goalCheckIn/clear', goalId: goal.id, date: weekStart })
                : set(momentum, momentum === 'snagged' ? entry?.snag : undefined)
            }
          >
            {MOMENTUM_WORD[momentum]}
          </button>
        ))}
      </div>

      {entry?.momentum === 'snagged' && (
        <div className={styles.snag}>
          <span className={styles.snagLabel} id={`snag-${goal.id}`}>
            {COPY.snagQuestion}
          </span>
          <div className={styles.picks} role="group" aria-labelledby={`snag-${goal.id}`}>
            {SNAGS.map((snag) => (
              <button
                key={snag}
                type="button"
                className={`${styles.pick} ${styles.pickSnag}`}
                aria-pressed={entry.snag === snag}
                onClick={() => set('snagged', snag)}
              >
                {SNAG_WORD[snag]}
              </button>
            ))}
          </div>
          {entry.snag && (
            <p className={styles.offer}>
              <span>{SNAG_OFFER[entry.snag]}</span>
              <button type="button" className={styles.offerButton} onClick={takeOffer}>
                {entry.snag === 'energy' || entry.snag === 'setup' ? 'Open the habit' : 'Add it'}
              </button>
            </p>
          )}
        </div>
      )}

      {entry && (
        <label className={styles.note}>
          <span className="visually-hidden">A note about {goal.title}</span>
          <input
            className="field"
            placeholder={MOMENTUM_NOTE[entry.momentum]}
            defaultValue={entry.note ?? ''}
            onBlur={(e) =>
              dispatch({
                type: 'goalCheckIn/set',
                goalId: goal.id,
                date: weekStart,
                momentum: entry.momentum,
                snag: entry.snag,
                note: e.target.value,
              })
            }
          />
        </label>
      )}
    </div>
  );
}
