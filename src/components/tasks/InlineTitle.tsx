import { useEffect, useRef, useState } from 'react';
import type { Task } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';

interface InlineTitleProps {
  task: Task;
  className?: string;
  inputClassName?: string;
  /** Lets the parent pause dragging while the name is being edited. */
  onEditingChange?: (editing: boolean) => void;
}

/** A task name that turns into a text field on click; Enter or blur saves, Escape cancels. */
export function InlineTitle({ task, className, inputClassName, onEditingChange }: InlineTitleProps) {
  const { dispatch } = useGaia();
  const { announce } = useFeedback();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const restoreFocus = useRef(false);

  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);

  const finished = useRef(false);

  const startEditing = () => {
    finished.current = false;
    setEditing(true);
  };

  const finish = (value: string) => {
    // Enter/Escape finish directly; the blur that follows unmounting must not commit twice.
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const title = value.trim();
    if (!cancelled.current && title && title !== task.title) {
      dispatch({ type: 'task/update', id: task.id, patch: { title } });
      announce(`Renamed to ${title}`);
    }
    cancelled.current = false;
    // Only reclaim focus when the edit ended from the keyboard; a click elsewhere keeps its target.
    if (restoreFocus.current) requestAnimationFrame(() => buttonRef.current?.focus());
    restoreFocus.current = false;
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={inputClassName}
        defaultValue={task.title}
        aria-label="Task name"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            restoreFocus.current = true;
            finish(e.currentTarget.value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelled.current = true;
            restoreFocus.current = true;
            finish(e.currentTarget.value);
          }
        }}
        onBlur={(e) => finish(e.currentTarget.value)}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={className}
      title={`${task.title} (click to rename)`}
      aria-label={`${task.title}, rename`}
      onClick={startEditing}
    >
      {task.title}
    </button>
  );
}
