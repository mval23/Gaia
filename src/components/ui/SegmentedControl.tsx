import { useRef, type KeyboardEvent } from 'react';
import styles from './ui.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  swatch?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** Apple-style segmented control implemented as an accessible radio group with roving focus. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, index: number) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    let next = -1;
    if (dir) next = (index + dir + options.length) % options.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = options.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${styles.segmented} ${size === 'sm' ? styles.segmentedSm : ''} ${className ?? ''}`}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.segment} ${selected ? styles.segmentSelected : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {opt.swatch && <span className={styles.segmentSwatch} style={{ background: opt.swatch }} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
