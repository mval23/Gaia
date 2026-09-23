import { useRef, useState, type CSSProperties } from 'react';
import type { Rest } from '../../types';
import type { Placement } from '../../lib/layout';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { HOUR_PX } from '../../dnd/DragProvider';
import { MIN_DURATION, formatDuration, formatRange } from '../../lib/time';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import styles from './timeline.module.css';

function restStyle(rest: Rest, placement: Placement): CSSProperties {
  const width = 100 / placement.lanes;
  return {
    top: (rest.startMin / 60) * HOUR_PX,
    height: Math.max((rest.durationMin / 60) * HOUR_PX - 2, 18),
    left: `calc(${placement.lane * width}% + 4px)`,
    width: `calc(${width}% - 8px)`,
  };
}

/**
 * Time kept for rest: a series, a nap, an evening with nobody in it. It carries
 * no toggle and asks nothing afterwards — there is nothing here to finish.
 */
export function RestBlock({ rest, placement }: { rest: Rest; placement: Placement }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const fmt = state.settings.timeFormat;
  const range = formatRange(rest.startMin, rest.durationMin, fmt);
  const label = rest.label?.trim() || 'Rest';
  const compact = rest.durationMin < 45;

  const resize = (delta: number) => {
    const durationMin = Math.max(MIN_DURATION, rest.durationMin + delta);
    dispatch({ type: 'rest/update', id: rest.id, schedule: { ...rest, durationMin } });
    announce(`${label}: ${formatDuration(durationMin)}`);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`${styles.block} ${styles.restBlock} ${compact ? styles.blockCompact : ''}`}
        style={restStyle(rest, placement)}
        aria-label={`${label}, ${range}, rest`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="moon" size={15} className={styles.restIcon} />
        <span className={styles.blockText}>
          <span className={styles.blockTitle}>{label}</span>
          <span className={styles.blockMeta}>
            {range} · {formatDuration(rest.durationMin)}
          </span>
        </span>
      </button>
      <Popover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={272} label={`${label}, rest`}>
        <div className={styles.restPanel}>
          <label className={styles.restField}>
            <span className="visually-hidden">What this rest is</span>
            <input
              className="field"
              placeholder="Rest"
              defaultValue={rest.label ?? ''}
              onBlur={(e) => dispatch({ type: 'rest/setLabel', id: rest.id, label: e.target.value })}
            />
          </label>
          <div className={styles.restRow}>
            <span className={styles.restRange}>{range}</span>
            <span className={styles.restButtons}>
              <button type="button" onClick={() => resize(-30)} aria-label="Half an hour shorter">
                −30m
              </button>
              <button type="button" onClick={() => resize(30)} aria-label="Half an hour longer">
                +30m
              </button>
            </span>
          </div>
          <p className={styles.restNote}>Rest is not empty time. Nothing asks what you did with it.</p>
          <button
            type="button"
            className={styles.restLetGo}
            onClick={() => {
              const previous = state;
              dispatch({ type: 'rest/remove', id: rest.id });
              setOpen(false);
              notify('Rest removed. The time is open again.', previous);
            }}
          >
            Let it go
          </button>
        </div>
      </Popover>
    </>
  );
}
