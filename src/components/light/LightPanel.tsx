import { Link } from 'react-router-dom';
import type { DayShape, Energy, Light, Mind, Sleep } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { lightFor, lightLogged, suggestedShape } from '../../store/selectors';
import { addDays, formatShortDate, todayISO } from '../../lib/dates';
import { COPY, SHAPE_NOTE, SHAPE_WORD } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './light.module.css';

const ENERGY: { value: Energy; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'some', label: 'Some' },
  { value: 'good', label: 'Good' },
];
const SLEEP: { value: Sleep; label: string }[] = [
  { value: 'rough', label: 'Rough' },
  { value: 'okay', label: 'Okay' },
  { value: 'rested', label: 'Rested' },
];
const MIND: { value: Mind; label: string }[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'full', label: 'Full' },
  { value: 'heavy', label: 'Heavy' },
];

const SHAPES: DayShape[] = ['gentle', 'steady', 'bright'];

/**
 * Three optional taps that describe a morning. Nothing is scored, tapping the
 * same answer again clears it, and a day nobody describes stays unlogged.
 *
 * It lives in the day header's popover and in the phone's sheet, so there is
 * one place to change it and one place it can be wrong.
 */
export function LightPanel({ date, onDone }: { date: string; onDone?: () => void }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const light = lightFor(state, date);
  const logged = lightLogged(light);
  const suggested = suggestedShape(light);
  const shape = light?.shape ?? suggested;

  /**
   * Answering the third question is the end of it, so the panel gets out of the
   * way on its own — after a beat, so the shape it lands on is seen first.
   * Anything else (untapping, changing the shape) leaves it open.
   */
  const set = (patch: Partial<Omit<Light, 'date'>>) => {
    dispatch({ type: 'light/set', date, patch });
    const next = { ...light, ...patch };
    if (next.energy && next.sleep && next.mind && !(light?.energy && light?.sleep && light?.mind)) {
      window.setTimeout(() => onDone?.(), 550);
    }
  };

  const row = <T extends string>(
    label: string,
    options: { value: T; label: string }[],
    current: T | undefined,
    key: 'energy' | 'sleep' | 'mind',
  ) => (
    <div className={styles.row}>
      <span className={styles.rowLabel} id={`light-${key}`}>
        {label}
      </span>
      <div className={styles.taps} role="group" aria-labelledby={`light-${key}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.tap}
            aria-pressed={current === option.value}
            onClick={() => set({ [key]: current === option.value ? undefined : option.value })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  // The day before this one, when nothing was written for it.
  const yesterday = addDays(date, -1);
  const yesterdayBlank = !lightLogged(lightFor(state, yesterday)) && yesterday <= todayISO();

  return (
    <div className={styles.panel}>
      {row('Energy', ENERGY, light?.energy, 'energy')}
      {row('Sleep', SLEEP, light?.sleep, 'sleep')}
      {row('Mind', MIND, light?.mind, 'mind')}

      <div className={styles.shape} data-shape={shape ?? 'none'} aria-live="polite">
        {logged || light?.shape ? (
          <>
            <strong>{SHAPE_WORD[shape ?? 'steady']}</strong>
            <span>{SHAPE_NOTE[shape ?? 'steady']}</span>
          </>
        ) : (
          <span>{COPY.lightEmpty}</span>
        )}
      </div>

      <div className={styles.shapePick} role="group" aria-label="Shape of the day">
        {SHAPES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.shapeButton}
            data-shape={option}
            aria-pressed={shape === option}
            onClick={() => {
              set({ shape: light?.shape === option ? undefined : option });
              announce(`${SHAPE_WORD[option]}`);
            }}
          >
            {SHAPE_WORD[option]}
          </button>
        ))}
      </div>

      {light?.mind === 'heavy' && (
        <p className={styles.support}>
          <Icon name="heart" size={15} />
          <span>
            Heavy days happen. If it stays heavy, <Link to="/support">Support</Link> lists people to talk to.
          </span>
        </p>
      )}

      <div className={styles.foot}>
        {yesterdayBlank ? (
          <Link className={styles.footLink} to={`/?date=${yesterday}`} onClick={onDone}>
            {formatShortDate(yesterday)} is blank · fill it in
          </Link>
        ) : (
          <span className={styles.footNote}>{COPY.lightFoot}</span>
        )}
        {logged && (
          <button
            type="button"
            className={styles.footButton}
            onClick={() => {
              dispatch({ type: 'light/clear', date });
              announce('Cleared. This day is unlogged again.');
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
