import { useEffect, useState } from 'react';
import type { Reminders } from '../../types';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { pushConfigured, pushStatus, sendTest, turnOffHere, turnOnHere, type PushStatus } from '../../lib/push';
import { DEFAULT_REMINDERS } from '../../lib/reminders';
import { formatClock } from '../../lib/time';
import { Select } from '../ui/Select';
import ui from '../ui/ui.module.css';
import settings from '../../pages/SettingsPage.module.css';

const LEADS = [0, 5, 10, 15];

/** Every half hour from `fromHour` up to (not including) `toHour`. */
const halfHours = (fromHour: number, toHour: number) =>
  Array.from({ length: Math.max(0, (toHour - fromHour) * 2) }, (_, i) => fromHour * 60 + i * 30);

/**
 * Phone notifications: this device signs up here, and what Gaia may say is
 * chosen once for every device on the account. Each one is off with a tap.
 */
export function Notifications() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const { reminders, timeFormat, dayStartHour, dayEndHour } = state.settings;

  useEffect(() => {
    if (pushConfigured) void pushStatus().then(setStatus);
  }, []);

  const setReminders = (patch: Partial<Reminders>) =>
    dispatch({ type: 'settings/update', patch: { reminders: { ...DEFAULT_REMINDERS, ...reminders, ...patch } } });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const clock = (min: number) => formatClock(min, timeFormat);

  return (
    <section className={settings.group} aria-labelledby="notifications">
      <h2 id="notifications" className={settings.groupTitle}>
        Notifications
      </h2>

      {!pushConfigured ? (
        <p className={settings.hint}>
          Notifications aren't set up yet. The README's Phone notifications section says how, then they can be turned
          on here.
        </p>
      ) : status === null ? null : status === 'install-first' ? (
        <p className={settings.hint}>
          On an iPhone, notifications come to Gaia on your home screen. In Safari, tap Share, then Add to Home Screen,
          open Gaia from there, and turn them on in Settings.
        </p>
      ) : status === 'unsupported' ? (
        <p className={settings.hint}>This browser can't show notifications from Gaia.</p>
      ) : status === 'blocked' ? (
        <p className={settings.hint}>
          Notifications for Gaia are turned off in this device's own settings. Allow them there, then come back.
        </p>
      ) : status === 'off' ? (
        <>
          <p className={settings.hint}>A few quiet reminders, only the ones you keep on. Each device is turned on by itself.</p>
          <div className={settings.actions}>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  try {
                    const next = await turnOnHere();
                    setStatus(next);
                    if (next !== 'on') return;
                    if (!reminders) setReminders({});
                    notify('Notifications are on for this device');
                  } catch {
                    notify("Gaia couldn't turn notifications on. Please try again.");
                  }
                })
              }
            >
              Turn on for this device
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={settings.row}>
            <span className={settings.label}>This device</span>
            <span className={settings.hint}>On</span>
          </div>
          <div className={settings.actions}>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  notify((await sendTest()) ? 'Sent. It should arrive in a moment.' : "Gaia couldn't send a test just now.");
                })
              }
            >
              Send a test
            </button>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await turnOffHere().catch(() => undefined);
                  setStatus(await pushStatus());
                  notify('Notifications are off on this device');
                })
              }
            >
              Turn off here
            </button>
          </div>
        </>
      )}

      {pushConfigured && reminders && (
        <>
          <div className={settings.row}>
            <label className={settings.label} htmlFor="remind-blocks">
              When a time block starts
            </label>
            <Select
              id="remind-blocks"
              value={reminders.blocks ? String(reminders.blockLeadMin) : 'off'}
              onChange={(e) =>
                setReminders(
                  e.target.value === 'off' ? { blocks: false } : { blocks: true, blockLeadMin: Number(e.target.value) },
                )
              }
            >
              <option value="off">Off</option>
              {LEADS.map((lead) => (
                <option key={lead} value={lead}>
                  {lead === 0 ? 'At the start' : `${lead} min before`}
                </option>
              ))}
            </Select>
          </div>

          <TimeRow
            id="remind-morning"
            label="The one that matters"
            on={reminders.morning}
            min={reminders.morningMin}
            times={halfHours(Math.min(dayStartHour, 5), 12)}
            clock={clock}
            onChange={(on, min) => setReminders(on ? { morning: true, morningMin: min } : { morning: false })}
          />
          <p className={settings.hint}>In the morning, on a day you've chosen one.</p>

          <TimeRow
            id="remind-look-back"
            label="Look back"
            on={reminders.lookBack}
            min={reminders.lookBackMin}
            times={halfHours(dayStartHour, dayEndHour)}
            clock={clock}
            onChange={(on, min) => setReminders(on ? { lookBack: true, lookBackMin: min } : { lookBack: false })}
          />
          <p className={settings.hint}>On your reflection day and the month's last day, until it's written.</p>

          <TimeRow
            id="remind-evening"
            label="Today's habits"
            on={reminders.evening}
            min={reminders.eveningMin}
            times={halfHours(Math.max(dayStartHour, 16), Math.max(dayEndHour, 17))}
            clock={clock}
            onChange={(on, min) => setReminders(on ? { evening: true, eveningMin: min } : { evening: false })}
          />
          <p className={settings.hint}>
            Only on a day with nothing logged yet, and not on a Gentle day. It never lists what's left.
          </p>
        </>
      )}
    </section>
  );
}

function TimeRow({
  id,
  label,
  on,
  min,
  times,
  clock,
  onChange,
}: {
  id: string;
  label: string;
  on: boolean;
  min: number;
  times: number[];
  clock: (min: number) => string;
  onChange: (on: boolean, min: number) => void;
}) {
  // A time chosen before the day's hours changed stays choosable.
  const options = times.includes(min) ? times : [...times, min].sort((a, b) => a - b);
  return (
    <div className={settings.row}>
      <label className={settings.label} htmlFor={id}>
        {label}
      </label>
      <Select
        id={id}
        value={on ? String(min) : 'off'}
        onChange={(e) => (e.target.value === 'off' ? onChange(false, min) : onChange(true, Number(e.target.value)))}
      >
        <option value="off">Off</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {clock(t)}
          </option>
        ))}
      </Select>
    </div>
  );
}
