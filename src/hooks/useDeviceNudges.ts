import { useEffect } from 'react';
import { useGaia } from '../store/GaiaProvider';
import { deviceNudgesOn, raiseDueNudges } from '../lib/deviceNudges';

/** How often the page looks at the clock. Often enough to be on time, rarely enough to cost nothing. */
const TICK_MS = 20_000;

/**
 * Watches the clock while Gaia is open and raises this computer's own
 * reminders. Mounted once, near the top of the app.
 *
 * A background tab is slowed down by the browser, so a nudge can arrive a
 * minute late; a closed tab or a sleeping computer gets nothing at all. That
 * is the bargain for needing no server, and Settings says so plainly.
 */
export function useDeviceNudges() {
  const { state } = useGaia();

  useEffect(() => {
    if (!deviceNudgesOn()) return;
    // Coming back to the tab is the likeliest moment to be behind.
    const tick = () => raiseDueNudges(state);
    tick();
    const id = window.setInterval(tick, TICK_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [state]);
}
