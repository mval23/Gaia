import { useRef, useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { Icon } from '../ui/Icon';
import styles from './tasks.module.css';

interface InlineAddTaskProps {
  /** Leave out to add a task with no category; it waits in the Inbox until sorted. */
  categoryId?: string;
  /** Stays on whichever of the two shapes is showing, so the walk can point at it. */
  id?: string;
  /** Where the task lands, for the field's name and the announcement. */
  placeName: string;
  /** Also choose the task for this day. */
  plannedFor?: string;
}

/** "+ Add task" that turns into an input; Enter creates the task in this category, or in none. */
export function InlineAddTask({ categoryId, id, placeName, plannedFor }: InlineAddTaskProps) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const add = () => {
    const title = value.trim();
    if (!title) return false;
    dispatch({ type: 'task/add', id: uid('t'), categoryId, title, plannedFor });
    announce(`Added “${title}” to ${placeName}`);
    setValue('');
    return true;
  };

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={styles.addTask}
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <Icon name="plus" size={16} />
        Add task
      </button>
    );
  }

  return (
    <div id={id} className={styles.addRow}>
      <span className={styles.addCircle} aria-hidden="true" />
      <input
        ref={inputRef}
        className={styles.addInput}
        value={value}
        placeholder="New task"
        aria-label={`New task in ${placeName}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setValue('');
            setEditing(false);
            requestAnimationFrame(() => buttonRef.current?.focus());
          }
        }}
        onBlur={() => {
          add();
          setEditing(false);
        }}
      />
      <span className={styles.addHint} aria-hidden="true">
        ↵
      </span>
    </div>
  );
}
