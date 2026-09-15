import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import styles from './SplitHandle.module.css';

interface SplitHandleProps {
  /** The element whose width the split percentage is measured against. */
  containerRef: RefObject<HTMLElement>;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (value: number) => void;
  label: string;
  controls?: string;
}

/** Draggable vertical divider between two panels, also operable with the keyboard. */
export function SplitHandle({ containerRef, value, min, max, defaultValue, onChange, label, controls }: SplitHandleProps) {
  const dragging = useRef(false);
  const clamp = (v: number) => Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture can fail for synthetic or already-released pointers; dragging still works.
    }
    e.currentTarget.focus();
    dragging.current = true;
    document.body.classList.add('is-col-resizing');
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    onChange(clamp(((e.clientX - r.left) / r.width) * 100));
  };

  const stop = () => {
    dragging.current = false;
    document.body.classList.remove('is-col-resizing');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const next =
      e.key === 'ArrowLeft' ? value - step
      : e.key === 'ArrowRight' ? value + step
      : e.key === 'Home' ? min
      : e.key === 'End' ? max
      : e.key === 'Enter' ? defaultValue
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(clamp(next));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`Tasks panel ${Math.round(value)}% wide`}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={styles.handle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDoubleClick={() => onChange(defaultValue)}
      onKeyDown={onKeyDown}
    >
      <span className={styles.grip} aria-hidden="true" />
    </div>
  );
}
