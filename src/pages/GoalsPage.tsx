import { useRef, useState } from 'react';
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
import { HabitsColumn } from '../components/habits/HabitsColumn';
import { SplitHandle } from '../components/ui/SplitHandle';
import { useStoredNumber } from '../hooks/useStoredNumber';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { paint } from '../lib/swatch';
import ui from '../components/ui/ui.module.css';
import styles from './GoalsPage.module.css';

const KIND_LABEL: Record<Goal['kind'], string> = {
  finish: 'Something to finish',
  ongoing: 'A direction',
};

// The Goals column's share of the width, in percent; Habits takes the rest.
const SPLIT_KEY = 'gaia:ui:goals-split';
const SPLIT_DEFAULT = 52;
const SPLIT_MIN = 30;
const SPLIT_MAX = 70;
// Matches the breakpoint where the two columns stack in GoalsPage.module.css.
const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

export function GoalsPage() {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const { openGoal } = useGoalEditor();
  const today = todayISO();
  const { active, resting, closed } = goalsByStatus(state);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const columnsRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useStoredNumber(SPLIT_KEY, SPLIT_DEFAULT);
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY);

  const add = () => {
    const title = draft.trim();
    if (!title) return false;
    const id = uid('goal');
    // Everything else is optional, and editable in the sheet that opens next.
    dispatch({ type: 'goal/add', id, title, kind: 'ongoing' });
    announce(`Added “${title}”. There’s no rush here.`);
    setDraft('');
    openGoal(id);
    return true;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Goals &amp; habits</p>
          <h1 className={styles.title}>What matters to you</h1>
        </div>
        <MonetAccent className={styles.accent} art="seine" variant="strip" fill phrase="make room for what matters" />
      </header>

      <div ref={columnsRef} className={styles.columns} style={{ ['--split' as string]: split }}>
        <section id="goals-column" className={styles.column} aria-labelledby="goals-title">
          <div className={styles.columnHead}>
            <h2 id="goals-title" className={styles.columnTitle}>
              Goals
            </h2>
            {!adding && (
              <button type="button" className={`${ui.pillButton} ${styles.addButton}`} onClick={() => setAdding(true)}>
                <Icon name="plus" size={15} />
                Add a goal
              </button>
            )}
          </div>

      {adding && (
        <div className={styles.addInline}>
          <input
            className="field"
            autoFocus
            placeholder="Something to move toward"
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
      )}

      {active.length === 0 && resting.length === 0 && closed.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="pond" variant="card" phrase="no goals yet, and that’s completely fine." />
          <p>
            Gaia works well with just tasks. When something matters to you, it can live here, with small habits and
            steps attached to it. Goals can be about doing less, too.
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
              <p className={styles.groupNote}>
                Their history stays. Choosing what not to pursue can make room for what matters now.
              </p>
              {closed.map((goal) => (
                <GoalCard key={goal.id} goal={goal} today={today} />
              ))}
            </section>
          )}
        </>
      )}

        </section>

        {sideBySide && (
          <SplitHandle
            containerRef={columnsRef}
            value={split}
            min={SPLIT_MIN}
            max={SPLIT_MAX}
            defaultValue={SPLIT_DEFAULT}
            onChange={setSplit}
            label="Resize goals and habits columns"
            controls="goals-column"
            valueText={(v) => `Goals column ${v}% wide`}
            className={styles.splitHandle}
          />
        )}

        <HabitsColumn />
      </div>

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

/**
 * A count the person keeps by hand. Small targets are drawn as one mark per
 * step, so the shape is the count itself rather than a percentage.
 */
function MilestoneCount({ goal, closed }: { goal: Goal; closed: boolean }) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const m = goal.milestone!;
  const unit = m.unit?.trim();
  const full = m.current >= m.target;

  return (
    <div className={styles.milestone}>
      {m.target <= 30 ? (
        <div className={styles.marks} aria-hidden="true">
          {Array.from({ length: m.target }, (_, i) => (
            <span key={i} className={styles.mark} data-on={i < m.current || undefined} />
          ))}
        </div>
      ) : (
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: `${(m.current / m.target) * 100}%` }} />
        </div>
      )}
      <p className={styles.milestoneText}>
        <strong>
          {m.current} of {m.target}
        </strong>
        {unit ? ` ${unit}` : ''}
      </p>
      {!closed && !full && (
        <button
          type="button"
          className={styles.plusOne}
          aria-label={`Add one to ${goal.title}`}
          onClick={() => {
            dispatch({ type: 'goal/update', id: goal.id, patch: { milestone: { ...m, current: m.current + 1 } } });
            announce(`${m.current + 1} of ${m.target}${unit ? ` ${unit}` : ''}`);
          }}
        >
          <Icon name="plus" size={14} />1
        </button>
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
      style={{ ['--cat' as string]: paint(category?.color) ?? 'var(--border-strong)' }}
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

      {goal.why &&
        (goal.status === 'completed' ? (
          <p className={styles.why}>You started because “{goal.why}”</p>
        ) : (
          <p className={styles.why}>{goal.why}</p>
        ))}

      {goal.status === 'completed' && !goal.closingNote && (
        <button type="button" className={`${ui.textButton} ${styles.addStep}`} onClick={() => openGoal(goal.id)}>
          Want to note what helped?
        </button>
      )}

      {closed && goal.closingNote && <p className={styles.closingNote}>{goal.closingNote}</p>}

      {goal.milestone && !state.settings.hideNumbers && <MilestoneCount goal={goal} closed={closed} />}

      {!state.settings.hideNumbers && !closed && (
        <p className={styles.activity}>
          {activity.steps} {activity.steps === 1 ? 'step' : 'steps'} taken · active {activity.activeDays} of the last{' '}
          {activity.windowDays} days
        </p>
      )}

      {(!closed || habits.length > 0 || tasks.length > 0) && (
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
          <div>
            <h4 className={styles.linkedTitle}>Steps</h4>
            {!closed && habits.length === 0 && tasks.length === 0 && (
              <p className={styles.linkedHint}>What’s one small way to begin? You can leave this for later.</p>
            )}
            {tasks.length > 0 && (
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
            )}
            <AddStep goal={goal} />
          </div>
        </div>
      )}

    </article>
  );
}

/** Creates a task already pointing at this goal, in the goal's category if it has one. */
function AddStep({ goal }: { goal: Goal }) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const categoryId = goal.categoryId;

  if (goal.status === 'completed' || goal.status === 'released') return null;

  const commit = () => {
    const title = value.trim();
    if (!title) return false;
    const id = uid('t');
    dispatch({ type: 'task/add', id, categoryId, title });
    dispatch({ type: 'task/update', id, patch: { goalId: goal.id } });
    announce(`Added “${title}” to ${goal.title}`);
    setValue('');
    return true;
  };

  if (!editing) {
    return (
      <button type="button" className={`${ui.textButton} ${styles.addStep}`} onClick={() => setEditing(true)}>
        <Icon name="plus" size={14} />
        Add a step
      </button>
    );
  }

  return (
    <input
      className={`field ${styles.addStepField}`}
      autoFocus
      placeholder="One small thing that moves this along"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Keep focus so several steps can be added in a row.
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setValue('');
          setEditing(false);
        }
      }}
      onBlur={() => {
        commit();
        setEditing(false);
      }}
    />
  );
}
