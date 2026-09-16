import { Link } from 'react-router-dom';
import type { Palette, Theme } from '../types';
import { useFeedback, useGaia } from '../store/GaiaProvider';
import { createEmpty, createSeed } from '../data/seed';
import { exportJSON } from '../store/persist';
import { weekdayName } from '../lib/dates';
import { formatClock } from '../lib/time';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Select } from '../components/ui/Select';
import { MonetAccent } from '../components/art/MonetAccent';
import ui from '../components/ui/ui.module.css';
import styles from './SettingsPage.module.css';

/** The four palettes, each lifted from one of the paintings in monet/. */
const PALETTES: { value: Palette; name: string; note: string; swatches: string[] }[] = [
  { value: 'lilies', name: 'Water Lilies', note: 'Warm ivory, lavender and sage', swatches: ['#f5f2ed', '#ab9dce', '#9fd0ba', '#5b6679'] },
  { value: 'rouen', name: 'Rouen Cathedral', note: 'Sunlit stone and gold', swatches: ['#f7f2e9', '#d3b58a', '#c9bda9', '#6b5f4e'] },
  { value: 'giverny', name: 'Garden at Giverny', note: 'Green shade and pale paths', swatches: ['#f1f4ee', '#9fc39b', '#b3c2ae', '#4f6350'] },
  { value: 'waterloo', name: 'Waterloo Bridge', note: 'Dusk mauve and smoke', swatches: ['#f3f1f4', '#c8a9c4', '#b8b0c6', '#5c5570'] },
];

export function SettingsPage() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { settings } = state;
  const hours = Array.from({ length: 25 }, (_, h) => h);
  const update = (patch: Parameters<typeof dispatch>[0] extends never ? never : Partial<typeof settings>) =>
    dispatch({ type: 'settings/update', patch });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className={styles.title}>Make it yours</h1>
        </div>
        <MonetAccent className={styles.accent} art="sunsetStrip" variant="strip" fill phrase="let the day unfold" />
      </header>

      <div className={styles.sections}>
        <section className={`${styles.group} ${styles.wide}`} aria-labelledby="appearance">
          <h2 id="appearance" className={styles.groupTitle}>
            Appearance
          </h2>

          <div className={styles.row}>
            <span className={styles.label}>Theme</span>
            <SegmentedControl
              size="sm"
              label="Theme"
              value={settings.theme}
              options={[
                { value: 'light' as Theme, label: 'Light' },
                { value: 'dark' as Theme, label: 'Dark' },
                { value: 'system' as Theme, label: 'System' },
              ]}
              onChange={(theme) => update({ theme })}
            />
          </div>
          <p className={styles.hint}>System follows whatever your computer is set to, and changes with it.</p>

          <div className={styles.paletteGrid} role="radiogroup" aria-label="Palette">
            {PALETTES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={settings.palette === p.value}
                className={styles.palette}
                onClick={() => update({ palette: p.value })}
              >
                <span className={styles.swatches} aria-hidden="true">
                  {p.swatches.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className={styles.paletteName}>{p.name}</span>
                <span className={styles.paletteNote}>{p.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.group} aria-labelledby="the-day">
          <h2 id="the-day" className={styles.groupTitle}>
            The day
          </h2>

          <div className={styles.row}>
            <span className={styles.label}>Time format</span>
            <SegmentedControl
              size="sm"
              label="Time format"
              value={settings.timeFormat}
              options={[
                { value: '24h' as const, label: '24h' },
                { value: '12h' as const, label: '12h' },
              ]}
              onChange={(timeFormat) => update({ timeFormat })}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="day-start">
              Day starts
            </label>
            <Select
              id="day-start"
              value={settings.dayStartHour}
              onChange={(e) => update({ dayStartHour: Number(e.target.value) })}
            >
              {hours.slice(0, settings.dayEndHour).map((h) => (
                <option key={h} value={h}>
                  {formatClock(h * 60, settings.timeFormat)}
                </option>
              ))}
            </Select>
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="day-end">
              Day ends
            </label>
            <Select
              id="day-end"
              value={settings.dayEndHour}
              onChange={(e) => update({ dayEndHour: Number(e.target.value) })}
            >
              {hours.slice(settings.dayStartHour + 1).map((h) => (
                <option key={h} value={h}>
                  {formatClock(h * 60, settings.timeFormat)}
                </option>
              ))}
            </Select>
          </div>
          <p className={styles.hint}>Waking hours are emphasised on timelines and used to work out open time.</p>

          <div className={styles.row}>
            <span className={styles.label}>Week starts</span>
            <SegmentedControl
              size="sm"
              label="Week starts on"
              value={settings.weekStart === 1 ? 'mon' : 'sun'}
              options={[
                { value: 'sun', label: 'Sunday' },
                { value: 'mon', label: 'Monday' },
              ]}
              onChange={(v) => update({ weekStart: v === 'mon' ? 1 : 0 })}
            />
          </div>
          <p className={styles.hint}>
            Used by the week view, the calendar grid, "this week" counts, and which week a reflection belongs to.
          </p>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="reflection-day">
              Reflection day
            </label>
            <Select
              id="reflection-day"
              value={settings.reflectionWeekday}
              onChange={(e) => update({ reflectionWeekday: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(`2026-09-${13 + d}`)}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <div className={styles.stack}>
          <section className={styles.group} aria-labelledby="counts">
            <h2 id="counts" className={styles.groupTitle}>
              Counts and figures
            </h2>
            <div className={styles.row}>
              <span className={styles.label}>Numbers</span>
              <SegmentedControl
                size="sm"
                label="Counts and figures"
                value={settings.hideNumbers ? 'hidden' : 'shown'}
                options={[
                  { value: 'shown', label: 'Shown' },
                  { value: 'hidden', label: 'Hidden' },
                ]}
                onChange={(v) => update({ hideNumbers: v === 'hidden' })}
              />
            </div>
            <p className={styles.hint}>
              Tracking is a tool, not a test. Hiding the numbers changes nothing you have logged, and you can bring them
              back whenever you like.
            </p>
          </section>

          <section className={styles.group} aria-labelledby="your-data">
            <h2 id="your-data" className={styles.groupTitle}>
              Your data
            </h2>
            <p className={styles.hint}>
              Everything stays in this browser, on this device. Gaia has no account and sends nothing anywhere.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={ui.secondaryButton}
                onClick={() => {
                  const blob = new Blob([exportJSON(state)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `gaia-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  notify('Your data was exported to a file');
                }}
              >
                Export your data
              </button>
              <button
                type="button"
                className={ui.secondaryButton}
                onClick={() => {
                  const previous = state;
                  dispatch({ type: 'state/replace', state: { ...createSeed(), settings } });
                  notify('Sample data restored', previous);
                }}
              >
                Reset to sample data
              </button>
              <button
                type="button"
                className={`${ui.secondaryButton} ${styles.danger}`}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Delete everything — every task, habit, goal and reflection on this device? You can undo this once, from the message that follows.',
                    )
                  )
                    return;
                  const previous = state;
                  dispatch({ type: 'state/replace', state: { ...createEmpty(), settings } });
                  notify('Everything deleted', previous);
                }}
              >
                Delete everything
              </button>
            </div>
          </section>
        </div>
      </div>

      <p className={styles.footNote}>
        Gaia is a planning tool, not a medical or mental-health service. If things feel heavy,{' '}
        <Link to="/support">support is here</Link>.
      </p>
    </div>
  );
}
