import { useState } from 'react';
import type { Goal } from '../types';
import { uid, useFeedback, useGaia } from '../store/GaiaProvider';
import { useGoalEditor, useHabitEditor } from '../hooks/useSheetParam';
import { useTaskEditor } from '../hooks/useTaskEditor';
import {
  categoryById,
  goalActivity,
  goalsByStatus,
  habitsForGoal,
  isHabitResting,
  tasksForGoal,
} from '../store/selectors';
import { formatShortDate, todayISO } from '../lib/dates';
import { rhythmLabel } from '../lib/rhythm';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import ui from '../components/ui/ui.module.css';
import styles from './GoalsPage.module.css';

const KIND_LABEL: Record<Goal['kind'], string> = {
  finish: 'Something to finish',
  ongoing: 'A direction',
};

export function GoalsPage() {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const { openGoal } = useGoalEditor();
  const today = todayISO();
  const { active, resting, closed } = goalsByStatus(state);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const add = () => {
    const title = draft.trim();
    if (!title) return false;
    const id = uid('goal');
    // Everything else is optional, and editable in the sheet that opens next.
    dispatch({ type: 'goal/add', id, title, kind: 'ongoing' });
    announce(`Added “${title}”`);
    setDraft('');
    openGoal(id);
    return true;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Goals</p>
          <h1 className={styles.title}>What matters to you</h1>
        </div>
        <MonetAccent art="seineStrip" variant="strip" phrase="make room for what matters" />
      </header>

      {adding ? (
        <div className={styles.addInline}>
          <input
            className="field"
            autoFocus
            placeholder="Something you'd like to move toward"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (add()) setAdding(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft('');
                setAdding(false);
              }
            }}
            onBlur={() => {
              add();
              setAdding(false);
            }}
          />
          <p className={styles.addHint}>
            It often helps to name what you want more of, rather than what you want to stop.
          </p>
        </div>
      ) : (
        <button type="button" className={`${ui.pillButton} ${styles.addButton}`} onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} />
          Add a goal
        </button>
      )}

      {active.length === 0 && resting.length === 0 && closed.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="gardenCard" variant="card" phrase="no goals yet, and that is fine." />
          <p>
            Gaia works well with just tasks. When something matters to you, it can live here, with small habits and
            steps attached to it.
          </p>
        </div>
      ) : (
        <>
          {active.map((goal) => (
            <GoalCard key={goal.id} goal={goal} today={today} />
          ))}

          {resting.length > 0 && (
            <section className={styles.group} aria-labelledby="resting-title">
              <h2 id="resting-title" className={styles.groupTitle}>
                Resting
              </h2>
              <p className={styles.groupNote}>Waiting for you, exactly as you left them.</p>
              {resting.map((goal) => (
                <GoalCard key={goal.id} goal={goal} today={today} />
              ))}
            </section>
          )}

          {closed.length > 0 && (
            <section className={styles.group} aria-labelledby="closed-title">
              <h2 id="closed-title" className={styles.groupTitle}>
                Finished and let go
              </h2>
              {closed.map((goal) => (
                <GoalCard key={goal.id} goal={goal} today={today} />
              ))}
            </section>
          )}
        </>
      )}

      {state.reflections.length > 0 && (
        <section className={styles.group} aria-labelledby="reflections-title">
          <h2 id="reflections-title" className={styles.groupTitle}>
            Weekly reflections
          </h2>
          <ul className={styles.reflections}>
            {[...state.reflections]
              .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
              .map((r) => (
                <li key={r.id} className={styles.reflection}>
                  <p className={styles.reflectionWeek}>Week of {formatShortDate(r.weekStart)}</p>
                  {r.wentWell && <p>{r.wentWell}</p>}
                  {r.wasHard && <p className={styles.reflectionHard}>{r.wasHard}</p>}
                  {r.oneThing && <p>{r.oneThing}</p>}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GoalCard({ goal, today }: { goal: Goal; today: string }) {
  const { state } = useGaia();
  const { openGoal } = useGoalEditor();
  const { openHabit } = useHabitEditor();
  const { openTask } = useTaskEditor();
  const category = categoryById(state, goal.categoryId);
  const habits = habitsForGoal(state, goal.id);
  const tasks = tasksForGoal(state, goal.id).filter((t) => t.status !== 'let-go');
  const activity = goalActivity(state, goal, today);
  const closed = goal.status === 'completed' || goal.status === 'released';

  return (
    <article
      className={styles.card}
      data-status={goal.status}
      // The top edge carries the colour, so the card body stays quiet.
      style={{ ['--cat' as string]: category?.color ?? 'var(--border-strong)' }}
    >
      <div className={styles.cardHead}>
        <div className={styles.cardTitleBlock}>
          <h3 className={styles.cardTitle}>
            <button type="button" className={styles.cardTitleButton} onClick={() => openGoal(goal.id)}>
              {goal.title}
            </button>
          </h3>
          <p className={styles.cardMeta}>
            {KIND_LABEL[goal.kind]}
            {category ? ` · ${category.name}` : ''}
            {goal.season?.end && !closed ? ` · by around ${formatShortDate(goal.season.end)}` : ''}
            {goal.status === 'paused' ? ' · resting' : ''}
            {goal.status === 'completed' ? ' · finished' : ''}
            {goal.status === 'released' ? ' · let go' : ''}
          </p>
        </div>
        <button
          type="button"
          className={`${ui.iconButton} ${ui.iconButtonSm}`}
          aria-label={`Edit ${goal.title}`}
          onClick={() => openGoal(goal.id)}
        >
          <Icon name="pencil" size={16} />
        </button>
      </div>

      {goal.why && <p className={styles.why}>{goal.why}</p>}

      {closed && goal.closingNote && <p className={styles.closingNote}>{goal.closingNote}</p>}

      {!state.settings.hideNumbers && !closed && (
        <p className={styles.activity}>
          {activity.steps} of {activity.totalSteps} {activity.totalSteps === 1 ? 'step' : 'steps'} taken · active on{' '}
          {activity.activeDays} of the last {activity.windowDays} days
        </p>
      )}

      {(habits.length > 0 || tasks.length > 0) && (
        <div className={styles.linkedGrid}>
          {habits.length > 0 && (
            <div>
              <h4 className={styles.linkedTitle}>Habits</h4>
              <ul className={styles.linkedList}>
                {habits.map((habit) => (
                  <li key={habit.id}>
                    <Icon name="rhythm" size={15} />
                    <button type="button" className={ui.textButton} onClick={() => openHabit(habit.id)}>
                      {habit.title}
                    </button>
                    <span className={styles.linkedMeta}>
                      {rhythmLabel(habit.rhythm)}
                      {isHabitResting(state, habit) ? ' · resting' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tasks.length > 0 && (
            <div>
              <h4 className={styles.linkedTitle}>Steps</h4>
              <ul className={styles.linkedList}>
                {tasks.map((task) => (
                  <li key={task.id} data-done={task.status === 'done' || undefined}>
                    <Icon name={task.status === 'done' ? 'check' : 'plan'} size={15} />
                    <button type="button" className={ui.textButton} onClick={() => openTask(task.id)}>
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {habits.length === 0 && tasks.length === 0 && !closed && (
        <p className={styles.activity}>Nothing attached yet, and that is fine. Naming it is enough for now.</p>
      )}
    </article>
  );
}
