import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGaia } from '../../store/GaiaProvider';
import { categoryById, groupOfTask } from '../../store/selectors';
import { useTaskEditor } from '../../hooks/useTaskEditor';
import { Icon } from '../ui/Icon';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import styles from './SearchPalette.module.css';

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useGaia();
  const { openTask } = useTaskEditor();
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.tasks
      .map((task) => {
        const cat = categoryById(state, task.categoryId);
        const group = groupOfTask(state, task);
        return { task, cat, group };
      })
      .filter(({ task, cat, group }) =>
        !q
          ? task.status === 'open'
          : task.title.toLowerCase().includes(q) ||
            cat?.name.toLowerCase().includes(q) ||
            group?.name.toLowerCase().includes(q),
      );
    return list.slice(0, 12);
  }, [query, state]);

  if (!open) return null;

  const choose = (id: string) => {
    onClose();
    openTask(id);
  };

  return createPortal(
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search tasks" className={styles.dialog}>
        <div className={styles.inputRow}>
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search tasks, categories, groups…"
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
                choose(results[active].task.id);
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
        <ul id={listId} role="listbox" aria-label="Tasks" className={styles.list}>
          {results.length === 0 && <li className={styles.empty}>Nothing found. Try another word.</li>}
          {results.map(({ task, cat, group }, i) => (
            <li
              key={task.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ''}`}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(task.id)}
            >
              <span className={styles.dot} style={{ background: cat?.color }} />
              <span className={`${styles.title} ${task.status === 'done' ? styles.done : ''}`}>{task.title}</span>
              <span className={styles.meta}>
                {group?.name} · {cat?.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
