import { useId, useRef, useState } from 'react';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { isComingBack, lightFor, lightLogged } from '../../store/selectors';
import { useCollapsed } from '../../hooks/useCollapsed';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import { Popover } from '../ui/Popover';
import { LightPanel } from '../light/LightPanel';
import light from '../light/light.module.css';
import styles from './plan.module.css';

/**
 * One line above Rhythms, and only when it has something to say: an invitation
 * to describe the morning, or a welcome back after a few quiet days. Answering
 * or dismissing it puts it away for that day; the day's shape then lives in the
 * header, where it is always one tap from being changed.
 */
export function LightPrompt({ date, isToday }: { date: string; isToday: boolean }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const { isCollapsed, toggle } = useCollapsed();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const logged = lightLogged(lightFor(state, date));
  const away = isComingBack(state, date);
  const key = `light-prompt:${date}`;
  const dismissed = isCollapsed(key);

  // The first tap makes the day logged, which would otherwise take this line —
  // and the panel hanging off it — away mid-answer. While the panel is open the
  // line stays; it steps aside once the panel is closed.
  if (!open && (!isToday || logged || dismissed)) return null;

  const dismiss = () => toggle(key, true);

  if (away) {
    return (
      <section className={styles.dayNote} aria-label="Welcome back">
        <div className={styles.dayNoteText}>
          <p className={styles.dayNoteTitle}>{COPY.welcomeBackTitle}</p>
          <p className={styles.dayNoteBody}>{COPY.welcomeBack}</p>
        </div>
        <button
          type="button"
          className={styles.dayNoteAction}
          onClick={() => {
            dispatch({ type: 'light/set', date, patch: { shape: 'gentle' } });
            announce('A gentle day. Tiny versions count in full.');
            dismiss();
          }}
        >
          Make it a gentle day
        </button>
        <button type="button" className={styles.dayNoteClose} aria-label="Put this away" onClick={dismiss}>
          <Icon name="close" size={15} />
        </button>
      </section>
    );
  }

  return (
    <>
      <div className={styles.lightLine}>
        <button
          ref={anchorRef}
          type="button"
          className={styles.lightLineButton}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="light" size={16} className={styles.lightLineIcon} />
          <span className={styles.lightLineText}>{COPY.lightInvite}</span>
          <span className={styles.lightLineHint}>three taps</span>
        </button>
        <button type="button" className={styles.dayNoteClose} aria-label="Not today" onClick={dismiss}>
          <Icon name="close" size={15} />
        </button>
      </div>
      <Popover
        anchorRef={anchorRef}
        open={open}
        onClose={() => setOpen(false)}
        align="start"
        width={340}
        label="Today's light"
        id={panelId}
      >
        <div className={light.popover}>
          <p className={light.popoverHead}>
            <span className="eyebrow">Today's light</span>
            <span>three taps, or none</span>
          </p>
          <LightPanel date={date} onDone={() => setOpen(false)} />
        </div>
      </Popover>
    </>
  );
}
