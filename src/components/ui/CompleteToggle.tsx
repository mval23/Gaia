import { Icon } from './Icon';
import styles from './ui.module.css';

interface CompleteToggleProps {
  done: boolean;
  title: string;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

/** Round completion control used in task rows and calendar blocks. */
export function CompleteToggle({ done, title, onToggle, size = 'md' }: CompleteToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark “${title}” as not done` : `Complete “${title}”`}
      className={`${styles.complete} ${size === 'sm' ? styles.completeSm : ''} ${done ? styles.completeDone : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Icon name="check" size={size === 'sm' ? 11 : 13} strokeWidth={2.2} />
    </button>
  );
}
