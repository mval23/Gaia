import { useEffect, useState } from 'react';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import {
  deviceStatus,
  raiseDueNudges,
  turnOffThisDevice,
  turnOnThisDevice,
  type DeviceStatus,
} from '../../lib/deviceNudges';
import { DEFAULT_REMINDERS } from '../../lib/reminders';
import { pushConfigured } from '../../lib/push';
import ui from '../ui/ui.module.css';
import settings from '../../pages/SettingsPage.module.css';

/**
 * Reminders raised by this computer while Gaia is open. Turned on per device,
 * and sharing the times chosen below, so there is one place to decide what
 * Gaia may say and a separate one for which machine says it.
 */
export function DeviceNotifications() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(deviceStatus());
  }, []);

  if (status === null) return null;

  const start = async () => {
    setBusy(true);
    try {
      const next = await turnOnThisDevice();
      setStatus(next);
      if (next !== 'on') return;
      // The times live in the planner; make sure there are some to go by.
      if (!state.settings.reminders) {
        dispatch({ type: 'settings/update', patch: { reminders: { ...DEFAULT_REMINDERS } } });
      }
      notify('This computer will speak up while Gaia is open');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={settings.row}>
        <span className={settings.label}>On this computer</span>
        <span className={settings.hint}>{status === 'on' ? 'On, while Gaia is open' : 'Off'}</span>
      </div>

      {status === 'unsupported' ? (
        <p className={settings.hint}>This browser can't show notifications from Gaia.</p>
      ) : status === 'blocked' ? (
        <p className={settings.hint}>
          Notifications for Gaia are turned off in this browser's own settings. Allow them there, then come back.
        </p>
      ) : status === 'off' ? (
        <>
          <p className={settings.hint}>
            While Gaia is open in a tab, this computer can say the same few things a phone would:{' '}
            {pushConfigured ? 'useful on the machine you work at' : 'no account and no server needed'}. Nothing arrives
            once the tab is closed or the computer is asleep.
          </p>
          <div className={settings.actions}>
            <button type="button" className={ui.secondaryButton} disabled={busy} onClick={start}>
              Turn on for this computer
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={settings.actions}>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() => {
                const said = raiseDueNudges(state);
                notify(said ? 'That was something due just now.' : 'Nothing is due this minute, so nothing was said.');
              }}
            >
              Say anything due now
            </button>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() => {
                turnOffThisDevice();
                setStatus(deviceStatus());
                notify('This computer will stay quiet');
              }}
            >
              Turn off here
            </button>
          </div>
          <p className={settings.hint}>
            It follows the times set below. A tab in the background may be a minute late, which is the browser's doing.
          </p>
        </>
      )}
    </>
  );
}
