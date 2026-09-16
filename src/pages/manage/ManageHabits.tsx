import { useMemo, useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { useParam, useSetParams } from '../../hooks/useDateParam';
import { useHabitEditor } from '../../hooks/useSheetParam';
import {
  categoriesInGroup,
  categoryById,
  checkInIndex,
  goalById,
  groupById,
  isHabitResting,
  sortedGroups,
  totalCount,
  weekCount,
} from '../../store/selectors';
import { rhythmLabel, weeklyTarget } from '../../lib/rhythm';
import { addDays, todayISO } from '../../lib/dates';
import { MANY_NEW_HABITS, MANY_NEW_HABITS_NOTE } from '../../lib/sensitive';
import { DotHistory } from '../../components/habits/DotHistory';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { MonetAccent } from '../../components/art/MonetAccent';
import ui from '../../components/ui/ui.module.css';
import styles from './manage.module.css';

export function ManageHabits() {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openHabit } = useHabitEditor();
  const [q, setQ] = useParam('q');
  const [groupId] = useParam('group');
  const [categoryId, setCategoryId] = useParam('category');
  const [status, setStatus] = useParam('status');
  const setParams = useSetParams();
  const today = todayISO();
  // One index for the whole page, shared by every row's graph.
  const log = useMemo(() => checkInIndex(state), [state.checkIns]);

  const groups = sortedGroups(state);
  const validGroup = groupId && groupById(state, groupId) ? groupId : null;
  const categoryOptions = validGroup ? categoriesInGroup(state, validGroup) : state.categories;
  const validCategory = categoryId && categoryOptions.some((c) => c.id === categoryId) ? categoryId : null;

  // A soft observation, not a limit: nothing is prevented.
  const startedThisWeek = state.habits.filter((h) => h.createdAt.slice(0, 10) > addDays(today, -7)).length;

  const rows = useMemo(() => {
    const query = (q ?? '').trim().toLowerCase();
    return state.habits
      .map((habit) => {
        const cat = categoryById(state, habit.categoryId);
        return { habit, cat, group: cat ? groupById(state, cat.groupId) : undefined };
      })
      .filter(({ habit, cat, group }) => {
        if (query && !habit.title.toLowerCase().includes(query) && !(habit.cue ?? '').toLowerCase().includes(query))
          return false;
        if (validGroup && group?.id !== validGroup) return false;
        if (validCategory && cat?.id !== validCategory) return false;
        if (status === 'active' && habit.status !== 'active') return false;
        if (status === 'resting' && habit.status === 'active') return false;
        if (status === 'archived' && habit.status !== 'archived') return false;
        return true;
      })
      .sort((a, b) => a.habit.title.localeCompare(b.habit.title));
  }, [state, q, validGroup, validCategory, status]);

  return (
    <section className={styles.panel} aria-label="Habits">
      <div className={styles.filters}>
        <label className={styles.search}>
          <Icon name="search" size={17} />
          <span className="visually-hidden">Search habits</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search habits…"
            value={q ?? ''}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Select
          aria-label="Filter by group"
          value={validGroup ?? ''}
          onChange={(e) => setParams({ group: e.target.value || null, category: null })}
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          value={validCategory ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
        >
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by status" value={status ?? ''} onChange={(e) => setStatus(e.target.value || null)}>
          <option value="">All Habits</option>
          <option value="active">Active</option>
          <option value="resting">Resting</option>
          <option value="archived">Archived</option>
        </Select>
        <span className={styles.count} aria-live="polite">
          {rows.length} {rows.length === 1 ? 'habit' : 'habits'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <MonetAccent art="irisTile" variant="card" phrase="small things, often. there is time." />
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map(({ habit, cat, group }) => {
            const resting = isHabitResting(state, habit);
            const goal = goalById(state, habit.goalId);
            return (
              <li key={habit.id} className={styles.habitRow} data-muted={resting || undefined}>
                <div className={styles.habitHead}>
                  <span className={styles.dot} style={{ background: cat?.color }} aria-hidden="true" />
                  <button type="button" className={styles.taskTitle} onClick={() => openHabit(habit.id)}>
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
                    <Icon name="pencil" size={16} />
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
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <div className={styles.habitStats} style={{ ['--cat' as string]: cat?.color }}>
                  <span className={styles.rowMeta}>
                    {rhythmLabel(habit.rhythm)}
                    {resting ? (habit.status === "archived" ? " · archived" : " · resting") : ""}
                  </span>
                  <DotHistory habitId={habit.id} date={today} log={log} />
                  {!state.settings.hideNumbers && (
                    <span className={styles.habitTally}>
                      {totalCount(state, habit.id)} times · {weekCount(state, habit.id, today)} of{' '}
                      {weeklyTarget(habit.rhythm)} this week
                    </span>
                  )}
                  <span className={styles.habitMeta}>
                    {group?.name} · {cat?.name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {startedThisWeek > MANY_NEW_HABITS && <p className={styles.softNote}>{MANY_NEW_HABITS_NOTE}</p>}

      <AddHabit
        categoryId={validCategory ?? categoryOptions[0]?.id}
        onAdd={(title, catId) => {
          const id = uid('h');
          dispatch({ type: 'habit/add', id, categoryId: catId, title });
          announce(`Added “${title}”`);
          openHabit(id);
        }}
      />
    </section>
  );
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
      <button type="button" className={`${ui.textButton} ${styles.addButton}`} onClick={() => setEditing(true)}>
        <Icon name="plus" size={16} />
        Add a habit
      </button>
    );
  }

  return (
    <div className={styles.addInline}>
      <input
        className="field"
        autoFocus
        placeholder="Something small you'd like to return to"
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
    </div>
  );
}
