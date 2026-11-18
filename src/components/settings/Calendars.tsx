import { useState } from 'react';
import { useFeedback, useGaia } from '../../store/GaiaProvider';
import { sortedGroups } from '../../store/selectors';
import { useFeeds } from '../../integrations/feeds/FeedsProvider';
import { Select } from '../ui/Select';
import ui from '../ui/ui.module.css';
import settings from '../../pages/SettingsPage.module.css';

/** A calendar address, however the service happens to hand it over. */
const looksLikeFeed = (url: string) => /^(https?|webcal):\/\/\S+$/i.test(url.trim());

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `feed-${Date.now()}`;

/**
 * Calendars kept somewhere else, read through the secret address they publish.
 * Nothing is sent back to them: their events sit on the timeline, and that is
 * all. Any calendar that can publish an iCal address works, Google and Apple
 * and Outlook alike.
 */
export function Calendars() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { states, refresh } = useFeeds();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const groups = sortedGroups(state);
  const feeds = state.calendarFeeds;
  const ready = name.trim().length > 0 && looksLikeFeed(url);

  const add = () => {
    if (!ready) return;
    dispatch({ type: 'feed/add', id: newId(), name: name.trim(), url: url.trim() });
    setName('');
    setUrl('');
    notify('Calendar added. Its events will appear on your days in a moment.');
  };

  return (
    <section className={settings.group} aria-labelledby="calendars">
      <h2 id="calendars" className={settings.groupTitle}>
        Calendars
      </h2>
      <p className={settings.hint}>
        Subscribe to a calendar you keep somewhere else and its events sit quietly on your timeline, in the colour you
        choose. Gaia only reads them: nothing is added, changed or sent back. Look in that calendar's settings for a
        secret address ending in <code>.ics</code> — Google calls it the secret address in iCal format, Apple calls it a
        public calendar, and Outlook calls it publishing a calendar.
      </p>

      {feeds.length > 0 && (
        <ul className={settings.feedList}>
          {feeds.map((feed) => {
            const feedState = states.get(feed.id);
            return (
              <li key={feed.id} className={settings.feedRow}>
                <div className={settings.feedMain}>
                  <span className={settings.label}>{feed.name}</span>
                  <span className={settings.hint}>
                    {feedState?.status === 'loading'
                      ? 'Reading…'
                      : feedState?.status === 'error'
                        ? feedState.error
                        : 'Read and up to date.'}
                  </span>
                </div>
                <Select
                  aria-label={`Colour for ${feed.name}`}
                  value={feed.groupId ?? ''}
                  onChange={(e) =>
                    dispatch({
                      type: 'feed/update',
                      id: feed.id,
                      patch: { groupId: e.target.value || undefined },
                    })
                  }
                >
                  <option value="">Its own colour</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  className={`${ui.secondaryButton} ${settings.danger}`}
                  onClick={() => {
                    const previous = state;
                    dispatch({ type: 'feed/remove', id: feed.id });
                    notify(`${feed.name} removed. Its events are no longer shown.`, previous);
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className={settings.feedForm}>
        <label className={settings.label} htmlFor="feed-name">
          Name
        </label>
        <input
          id="feed-name"
          className={settings.feedInput}
          value={name}
          placeholder="Work"
          onChange={(e) => setName(e.target.value)}
        />
        <label className={settings.label} htmlFor="feed-url">
          Secret address
        </label>
        <input
          id="feed-url"
          className={settings.feedInput}
          value={url}
          placeholder="https://…/basic.ics"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
      </div>
      <div className={settings.actions}>
        <button type="button" className={ui.secondaryButton} disabled={!ready} onClick={add}>
          Add calendar
        </button>
        {feeds.length > 0 && (
          <button type="button" className={ui.secondaryButton} onClick={refresh}>
            Read them again
          </button>
        )}
      </div>
      <p className={settings.hint}>
        Treat that address like a password: anyone who has it can read the calendar. Gaia keeps it with the rest of
        your planner.
      </p>
    </section>
  );
}
