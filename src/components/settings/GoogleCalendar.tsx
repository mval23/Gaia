import { useState } from 'react';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { useGoogle } from '../../integrations/google/GoogleProvider';
import { describeGoogleError } from '../../auth/google';
import { Select } from '../ui/Select';
import ui from '../ui/ui.module.css';
import settings from '../../pages/SettingsPage.module.css';

/**
 * Writing this planner's time blocks into a Google calendar. One direction:
 * what you plan here shows up there. To see that calendar's own events on your
 * timeline, subscribe to it under Calendars, just above.
 */
export function GoogleCalendar() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { access, calendars, syncing, error, connect, disconnect } = useGoogle();
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);

  const linked = state.settings.googleCalendar;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setTrouble(null);
    try {
      await action();
    } catch (err) {
      setTrouble(describeGoogleError(err));
    } finally {
      setBusy(false);
    }
  };

  const choose = (id: string) => {
    const calendar = (calendars ?? []).find((c) => c.id === id);
    const previous = state;
    dispatch({
      type: 'settings/update',
      patch: { googleCalendar: calendar ? { id: calendar.id, name: calendar.name } : undefined },
    });
    notify(
      calendar
        ? `Your time blocks from today on will appear in ${calendar.name}.`
        : `Gaia's events will be taken back out of ${linked?.name ?? 'that calendar'}.`,
      previous,
    );
  };

  return (
    <section className={settings.group} aria-labelledby="google-calendar">
      <h2 id="google-calendar" className={settings.groupTitle}>
        Google Calendar
      </h2>

      {access === 'unconfigured' ? (
        <p className={settings.hint}>
          Not set up yet. The README's Google Calendar section says how to make a client id, which goes in .env.local
          as VITE_GOOGLE_CLIENT_ID.
        </p>
      ) : access === 'disconnected' ? (
        <>
          <p className={settings.hint}>
            Connect Google and the tasks you give a time here are added to a calendar you choose, and kept in step when
            you move, rename or let go of them. Gaia only touches the events it made.
          </p>
          <div className={settings.actions}>
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() => run(async () => { await connect(); notify('Google connected'); })}
            >
              Connect Google
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={settings.row}>
            <label className={settings.label} htmlFor="google-calendar-pick">
              Write my time blocks to
            </label>
            <Select
              id="google-calendar-pick"
              value={linked?.id ?? ''}
              disabled={access === 'needs-consent'}
              onChange={(e) => choose(e.target.value)}
            >
              <option value="">Nowhere</option>
              {calendars === null ? (
                linked && (
                  <option key={linked.id} value={linked.id}>
                    {linked.name}
                  </option>
                )
              ) : (
                calendars
                  .filter((c) => c.canEdit)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
              )}
            </Select>
          </div>

          <p className={settings.hint}>
            {access === 'needs-consent'
              ? 'Google gives Gaia an hour at a time, and only when you ask it to. Approve again to let it catch up with anything you have changed since.'
              : syncing
                ? 'Sending your blocks across…'
                : linked
                  ? `Blocks from today on are kept in ${linked.name}. Choosing Nowhere takes them all back out.`
                  : 'Nothing is being written. Choose a calendar to start.'}
          </p>
          {(trouble ?? error) && <p className={settings.trouble}>{trouble ?? error}</p>}

          <div className={settings.actions}>
            {access === 'needs-consent' && (
              <button
                type="button"
                className={ui.secondaryButton}
                disabled={busy}
                onClick={() => run(async () => { await connect(); notify('Google reconnected'); })}
              >
                Approve again
              </button>
            )}
            <button
              type="button"
              className={ui.secondaryButton}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await disconnect();
                  notify('Google disconnected. Events already there are left alone.');
                })
              }
            >
              Disconnect
            </button>
          </div>
          <p className={settings.hint}>
            Events from that calendar don't appear here on their own. To see them on your timeline, add it under
            Calendars with its secret address.
          </p>
        </>
      )}
    </section>
  );
}
