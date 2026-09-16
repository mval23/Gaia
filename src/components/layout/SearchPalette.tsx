import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGaia } from '../../store/GaiaProvider';
import { categoryById, groupById, groupOfTask } from '../../store/selectors';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { useGoalEditor, useHabitEditor } from '../../hooks/useSheetParam';
import { rhythmLabel } from '../../lib/rhythm';
import { Icon } from '../ui/Icon';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './SearchPalette.module.css';

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGaia();
  const { openTask } = useTaskEditor();
  const { openGoal } = useGoalEditor();
  const { openHabit } = useHabitEditor();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  type Result = {
    kind: 'task' | 'habit' | 'goal';
    id: string;
    title: string;
    meta: string;
    color?: string;
    struck?: boolean;
  };

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const hit = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));

    const tasks: Result[] = state.tasks
      .map((task) => ({ task, cat: categoryById(state, task.categoryId), group: groupOfTask(state, task) }))
      .filter(({ task, cat, group }) => (!q ? task.status === 'open' : hit(task.title, cat?.name, group?.name)))
      .map(({ task, cat, group }) => ({
        kind: 'task' as const,
        id: task.id,
        title: task.title,
        meta: [group?.name, cat?.name].filter(Boolean).join(' · '),
        color: cat?.color,
        struck: task.status === 'done',
      }));

    const habits: Result[] = state.habits
      .map((habit) => {
        const cat = categoryById(state, habit.categoryId);
        return { habit, cat, group: cat ? groupById(state, cat.groupId) : undefined };
      })
      .filter(({ habit, cat, group }) => (!q ? habit.status === 'active' : hit(habit.title, habit.cue, cat?.name, group?.name)))
      .map(({ habit, cat }) => ({
        kind: 'habit' as const,
        id: habit.id,
        title: habit.title,
        meta: ['Habit', rhythmLabel(habit.rhythm), cat?.name].filter(Boolean).join(' · '),
        color: cat?.color,
      }));

    const goals: Result[] = state.goals
      .filter((goal) => (!q ? goal.status === 'active' : hit(goal.title, goal.why)))
      .map((goal) => ({
        kind: 'goal' as const,
        id: goal.id,
        title: goal.title,
        meta: ['Goal', goal.status === 'active' ? null : goal.status === 'paused' ? 'resting' : 'closed']
          .filter(Boolean)
          .join(' · '),
        color: categoryById(state, goal.categoryId)?.color,
      }));

    return [...tasks, ...habits, ...goals].slice(0, 12);
  }, [query, state]);

  if (!open) return null;

  const choose = (result: Result) => {
    onClose();
    if (result.kind === 'task') openTask(result.id);
    else if (result.kind === 'habit') openHabit(result.id);
    else openGoal(result.id);
  };

  return createPortal(
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search" className={styles.dialog}>
        <div className={styles.inputRow}>
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search tasks, habits, goals…"
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close search">
            <Icon name="close" size={16} />
          </button>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className={styles.list}>
          {results.length === 0 && <li className={styles.empty}>Nothing found. Try another word.</li>}
          {results.map((result, i) => (
            <li
              key={`${result.kind}-${result.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ''}`}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(result)}
            >
              <span className={styles.dot} style={{ background: result.color }} />
              <span className={`${styles.title} ${result.struck ? styles.done : ''}`}>{result.title}</span>
              <span className={styles.meta}>{result.meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
