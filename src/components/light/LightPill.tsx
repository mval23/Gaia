import { useId, useRef, useState } from 'react';
import { useGaia } from '../../store/GaiaProvider';
import { dayShape, lightFor, lightLogged } from '../../store/selectors';
import { SHAPE_WORD } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { LightPanel } from './LightPanel';
import ui from '../ui/ui.module.css';
import styles from './light.module.css';

/**
 * One control for the light and the shape of the day, in the day header where
 * "Gentle day" used to be. Before the morning is described it invites three
 * taps; afterwards it simply says what kind of day this is.
 */
export function LightPill({ date, className }: { date: string; className?: string }) {
  const { state } = useGaia();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const light = lightFor(state, date);
  const logged = lightLogged(light) || !!light?.shape;
  const shape = dayShape(state, date);
  const dots: (string | undefined)[] = [light?.energy, light?.sleep, light?.mind];

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`${ui.pillButton} ${styles.pill} ${className ?? ''}`}
        data-shape={logged ? shape : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {logged ? (
          <>
            <span className={styles.pillDot} aria-hidden="true" />
            {SHAPE_WORD[shape]}
          </>
        ) : (
          "Today's light"
        )}
        <span className={styles.pillDots} aria-hidden="true">
          {dots.map((value, i) => (
            <span key={i} data-on={value ? '' : undefined} />
          ))}
        </span>
        <Icon name="chevronDown" size={15} />
      </button>
      <Popover
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
        width={340}
        label="Today's light"
        id={panelId}
      >
        <div className={styles.popover}>
          <p className={styles.popoverHead}>
            <span className="eyebrow">Today's light</span>
            <span>three taps, or none</span>
          </p>
          <LightPanel date={date} onDone={() => setOpen(false)} />
        </div>
      </Popover>
    </>
  );
}
