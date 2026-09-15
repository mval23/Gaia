import { useRef, useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { Icon } from '../ui/Icon';
import styles from './tasks.module.css';

/** "+ Add task" that turns into an input; Enter creates the task inside this category. */
export function InlineAddTask({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const add = () => {
    const title = value.trim();
    if (!title) return false;
    dispatch({ type: 'task/add', id: uid('t'), categoryId, title });
    announce(`Added “${title}” to ${categoryName}`);
    setValue('');
    return true;
  };

  if (!editing) {
    return (
      <button
        ref={buttonRef}
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
    <div className={styles.addRow}>
      <span className={styles.addCircle} aria-hidden="true" />
      <input
        ref={inputRef}
        className={styles.addInput}
        value={value}
        placeholder="New task"
        aria-label={`New task in ${categoryName}`}
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
