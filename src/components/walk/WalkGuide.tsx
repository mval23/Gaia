import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from '../ui/Popover';
import { useGaia } from '../../store/GaiaProvider';
import { SINGLE_PANEL_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useWalk } from './WalkProvider';
import styles from './walk.module.css';

const REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * Plan splits into one panel at a time on a narrow screen, so a stop that
 * points at the timeline has to bring the timeline up first. The walk presses
 * the real control rather than reaching into the page's state.
 */
function showPanel(panel: 'tasks' | 'day'): void {
  const group = document.querySelector('[role="radiogroup"][aria-label="Show panel"]');
  // By position, not by label, so the words on the control stay free to change.
  const button = group?.querySelectorAll<HTMLElement>('[role="radio"]')[panel === 'day' ? 1 : 0];
  if (button && button.getAttribute('aria-checked') !== 'true') button.click();
}

/** The note itself: a scrim with a hole in it, and a card beside what it points at. */
export function WalkGuide() {
  const { step, index, total, last, next, back, end } = useWalk();
  const { state } = useGaia();
  const singlePanel = useMediaQuery(SINGLE_PANEL_QUERY);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  anchorRef.current = anchor;

  // Find what this stop points at. A stop can arrive before its page has
  // rendered, so keep looking for a moment rather than giving up at once.
  useEffect(() => {
    if (!step) {
      setAnchor(null);
      return;
    }
    let frame = 0;
    let tries = 0;
    const look = () => {
      if (singlePanel && step.panel) showPanel(step.panel);
      const found = document.getElementById(step.anchorId);
      if (found) {
        setAnchor(found);
        return;
      }
      if (tries++ < 90) frame = requestAnimationFrame(look);
    };
    look();
    return () => cancelAnimationFrame(frame);
  }, [step, singlePanel]);

  // Bring it into view, then again as the page settles: a panel appearing or
  // the timeline jumping to the current hour can carry the anchor off screen
  // a moment after the first scroll.
  useEffect(() => {
    if (!anchor) return;
    const gentle = !window.matchMedia(REDUCED).matches;
    anchor.scrollIntoView({ block: 'center', behavior: gentle ? 'smooth' : 'auto' });
    // A smooth scroll is cancelled by the next one, so the follow-ups only
    // step in when the anchor is still out of sight, and they go straight
    // there rather than restarting the animation.
    const correct = () => {
      const { top, bottom } = anchor.getBoundingClientRect();
      if (bottom < 0 || top > window.innerHeight) {
        anchor.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      setRect(anchor.getBoundingClientRect());
    };
    const again = [window.setTimeout(correct, 320), window.setTimeout(correct, 750)];
    return () => again.forEach(clearTimeout);
  }, [anchor]);

  // Follow it while the page settles, scrolls or resizes.
  useEffect(() => {
    if (!anchor) {
      setRect(null);
      return;
    }
    const place = () => setRect(anchor.getBoundingClientRect());
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);

  // Each stop announces itself, and the card is where the keyboard lands.
  // The card stays hidden until the popover has measured where to put it, and
  // nothing hidden can take focus, so keep asking until it does.
  useEffect(() => {
    if (!step || !anchor) return;
    let frame = 0;
    let tries = 0;
    const take = () => {
      const title = titleRef.current;
      title?.focus();
      if (document.activeElement === title) return;
      if (tries++ < 30) frame = requestAnimationFrame(take);
    };
    frame = requestAnimationFrame(take);
    return () => cancelAnimationFrame(frame);
  }, [step, anchor]);

  if (!step || index === null) return null;

  return (
    <>
      {rect &&
        createPortal(
          <div
            className={styles.halo}
            aria-hidden="true"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          />,
          document.body,
        )}

      <Popover
        open
        anchorRef={anchorRef}
        align="start"
        width={330}
        label="A walk through Gaia"
        className={styles.card}
        // Escape leaves. A click outside does not, so you can use the very
        // thing the walk is pointing at.
        onClose={(reason) => {
          if (reason === 'escape') end();
        }}
      >
        <div className={styles.body}>
          {!state.settings.hideNumbers && (
            <p className={styles.count}>
              {index + 1} of {total}
            </p>
          )}
          <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
            {step.title}
          </h2>
          <p className={styles.text}>{step.body}</p>
          {step.aside && <p className={styles.aside}>{step.aside}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.leave} onClick={end}>
              Leave the walk
            </button>
            {index > 0 && (
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
            )}
            <button type="button" className={styles.next} onClick={last ? end : next}>
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}
