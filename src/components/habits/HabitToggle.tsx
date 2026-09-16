import type { CheckInKind } from '../../types';
import { Icon } from '../ui/Icon';
import styles from './habits.module.css';

/** One circle, four states, in this order. A fourth press clears the day. */
const ORDER = [undefined, 'done', 'tiny', 'rest'] as const;

const WORD: Record<CheckInKind, string> = {
  done: 'done',
  tiny: 'the tiny version',
  rest: 'a rest day',
};

const say = (kind: CheckInKind | undefined) => (kind ? WORD[kind] : 'nothing logged');

interface Props {
  title: string;
  value: CheckInKind | undefined;
  tinyVersion?: string;
  onSet: (kind: CheckInKind) => void;
  onClear: () => void;
}

/**
 * The same round control the tasks use, cycling rather than toggling: press
 * once for done, again for the tiny version, again for a rest day, and once
 * more to leave the day blank. Each state also has its own shape, so colour is
 * never the only thing carrying the meaning.
 */
export function HabitToggle({ title, value, tinyVersion, onSet, onClear }: Props) {
  const next = ORDER[(ORDER.indexOf(value as never) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className={styles.toggle}
      data-kind={value ?? 'none'}
      aria-label={`${title}: ${say(value)}. Press for ${say(next)}.`}
      title={value === 'tiny' && tinyVersion ? tinyVersion : `${say(value)} — press for ${say(next)}`}
      onClick={() => (next ? onSet(next) : onClear())}
    >
      {value === 'done' && <Icon name="check" size={13} strokeWidth={2.2} />}
      {value === 'tiny' && <span className={styles.glyphTiny} aria-hidden="true" />}
      {value === 'rest' && <span className={styles.glyphRest} aria-hidden="true" />}
    </button>
  );
}
