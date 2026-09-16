import type { CheckInKind } from '../../types';
import styles from './habits.module.css';

const OPTIONS: { kind: CheckInKind; label: string; hint: string }[] = [
  { kind: 'done', label: 'Done', hint: 'done' },
  { kind: 'tiny', label: 'Tiny', hint: 'the tiny version' },
  { kind: 'rest', label: 'Rest', hint: 'a rest day' },
];

interface Props {
  title: string;
  /** Undefined means nothing is logged for this day, which is simply a blank. */
  value: CheckInKind | undefined;
  tinyVersion?: string;
  onSet: (kind: CheckInKind) => void;
  onClear: () => void;
}

/**
 * Three equal ways to log a day. Pressing the one already chosen clears it, so
 * a mistap costs nothing. There is deliberately no control that records a miss.
 */
export function CheckInControl({ title, value, tinyVersion, onSet, onClear }: Props) {
  return (
    <div className={styles.checkIn} role="group" aria-label={`Log ${title}`}>
      {OPTIONS.map((option) => {
        const active = value === option.kind;
        return (
          <button
            key={option.kind}
            type="button"
            className={styles.checkInButton}
            data-kind={option.kind}
            aria-pressed={active}
            aria-label={`${title}: ${active ? 'logged' : 'log'} ${option.hint}`}
            title={option.kind === 'tiny' && tinyVersion ? tinyVersion : undefined}
            onClick={() => (active ? onClear() : onSet(option.kind))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
