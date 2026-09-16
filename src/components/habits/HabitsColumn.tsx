import { useMemo, useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { useHabitEditor } from '../../hooks/useSheetParam';
import {
  categoryById,
  checkInIndex,
  firstLoggedDate,
  goalById,
  groupById,
  isHabitResting,
  isQuiet,
  totalCount,
  weekCount,
} from '../../store/selectors';
import { rhythmLabel, weeklyTarget } from '../../lib/rhythm';
import { addDays, fromISODate, todayISO } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { MANY_NEW_HABITS, MANY_NEW_HABITS_NOTE } from '../../lib/sensitive';
import { DotHistory } from './DotHistory';
import { Icon } from '../ui/Icon';
import { MonetAccent } from '../art/MonetAccent';
import ui from '../ui/ui.module.css';
import styles from '../../pages/GoalsPage.module.css';

/**
 * Every habit, with its recent pattern — the half of this page that used to
 * live under Manage. Active ones first; resting and archived settle below.
 */
export function HabitsColumn() {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openHabit } = useHabitEditor();
  const today = todayISO();
  const log = useMemo(() => checkInIndex(state), [state.checkIns]);

  const habits = useMemo(
    () =>
      [...state.habits].sort(
        (a, b) =>
          Number(isHabitResting(state, a)) - Number(isHabitResting(state, b)) || a.title.localeCompare(b.title),
      ),
    [state],
  );

  const startedThisWeek = state.habits.filter((h) => h.createdAt.slice(0, 10) > addDays(today, -7)).length;

  return (
    <section className={styles.column} aria-labelledby="habits-title">
      <div className={styles.columnHead}>
        <h2 id="habits-title" className={styles.columnTitle}>
          Habits
        </h2>
        <AddHabit
          categoryId={state.categories[0]?.id}
          onAdd={(title, categoryId) => {
            const id = uid('h');
            dispatch({ type: 'habit/add', id, categoryId, title });
            announce(`Added “${title}”. Habits take a while to feel natural, so be patient with it.`);
            openHabit(id);
          }}
        />
      </div>

      {habits.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="irisTile" variant="card" phrase="small things, often." />
          <p>{COPY.rhythmsEmpty}</p>
        </div>
      ) : (
        <ul className={styles.habitList}>
          {habits.map((habit) => {
            const cat = categoryById(state, habit.categoryId);
            const group = cat ? groupById(state, cat.groupId) : undefined;
            const goal = goalById(state, habit.goalId);
            const resting = isHabitResting(state, habit);
            const total = totalCount(state, habit.id);
            const since = firstLoggedDate(state, habit.id);
            const flexible = habit.rhythm.type === 'timesPerWeek';
            return (
              <li
                key={habit.id}
                className={styles.habitRow}
                data-muted={resting || undefined}
                style={{ ['--cat' as string]: cat?.color ?? 'var(--border-strong)' }}
              >
                <div className={styles.habitHead}>
                  <span className={styles.habitDot} aria-hidden="true" />
                  <button type="button" className={styles.habitName} onClick={() => openHabit(habit.id)}>
                    {habit.title}
                  </button>
                  {goal && <span className={styles.habitGoal}>{goal.title}</span>}
                  <span className={styles.habitSpacer} />
                  <button
                    type="button"
                    className={`${ui.iconButton} ${ui.iconButtonSm}`}
                    aria-label={`Edit ${habit.title}`}
                    onClick={() => openHabit(habit.id)}
                  >
                    <Icon name="pencil" size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${ui.iconButton} ${ui.iconButtonSm} ${styles.danger}`}
                    aria-label={`Delete ${habit.title}`}
                    onClick={() => {
                      const previous = state;
                      dispatch({ type: 'habit/delete', id: habit.id });
                      notify(`“${habit.title}” deleted, along with its history`, previous);
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <div className={styles.habitStats}>
                  <DotHistory habitId={habit.id} date={today} log={log} />
                  <span className={styles.habitMeta}>
                    {rhythmLabel(habit.rhythm)}
                    {resting ? (habit.status === 'archived' ? ' · archived' : ' · resting') : ''}
                    {!resting && isQuiet(state, habit, today) ? ' · hasn’t found its place lately, and that happens' : ''}
                  </span>
                  {!state.settings.hideNumbers && (
                    <span className={styles.habitTally}>
                      {weekCount(state, habit.id, today)} of {flexible ? 'about ' : ''}
                      {weeklyTarget(habit.rhythm)} this week
                      {total > 0 && ` · ${total} ${total === 1 ? 'time' : 'times'} since ${sinceLabel(since, today)}`}
                    </span>
                  )}
                  <span className={styles.habitWhere}>
                    {group?.name} · {cat?.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {startedThisWeek > MANY_NEW_HABITS && <p className={styles.softNote}>{MANY_NEW_HABITS_NOTE}</p>}
    </section>
  );
}

/** "June", or "June 2025" once it is from another year. */
function sinceLabel(date: string | undefined, today: string): string {
  if (!date) return 'the start';
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return fromISODate(date).toLocaleDateString('en-US', sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
}

/** Adds a habit with a forgiving default rhythm; the rest is editable after. */
function AddHabit({ categoryId, onAdd }: { categoryId?: string; onAdd: (title: string, categoryId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!categoryId) return null;

  const commit = () => {
    const title = value.trim();
    if (!title) return false;
    onAdd(title, categoryId);
    setValue('');
    return true;
  };

  if (!editing) {
    return (
      <button type="button" className={`${ui.pillButton} ${styles.addButton}`} onClick={() => setEditing(true)}>
        <Icon name="plus" size={15} />
        Add a habit
      </button>
    );
  }

  return (
    <input
      className={`field ${styles.addField}`}
      autoFocus
      placeholder="Something small to return to"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (commit()) setEditing(false);
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
