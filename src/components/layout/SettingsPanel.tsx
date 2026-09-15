import { useGaia, useFeedback } from '../../store/GaiaProvider';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { createSeed } from '../../data/seed';
import { formatClock } from '../../lib/time';
import ui from '../ui/ui.module.css';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const { settings } = state;
  const hours = Array.from({ length: 25 }, (_, h) => h);

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label} id="settings-time-format">
          Time format
        </span>
        <SegmentedControl
          size="sm"
          label="Time format"
          value={settings.timeFormat}
          options={[
            { value: '24h', label: '24h' },
            { value: '12h', label: '12h' },
          ]}
          onChange={(v) => dispatch({ type: 'settings/update', patch: { timeFormat: v } })}
        />
      </div>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="settings-day-start">
          Day starts
        </label>
        <Select
          id="settings-day-start"
          value={settings.dayStartHour}
          className={styles.select}
          onChange={(e) => dispatch({ type: 'settings/update', patch: { dayStartHour: Number(e.target.value) } })}
        >
          {hours.slice(0, settings.dayEndHour).map((h) => (
            <option key={h} value={h}>
              {formatClock(h * 60, settings.timeFormat)}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.row}>
        <label className={styles.label} htmlFor="settings-day-end">
          Day ends
        </label>
        <Select
          id="settings-day-end"
          value={settings.dayEndHour}
          className={styles.select}
          onChange={(e) => dispatch({ type: 'settings/update', patch: { dayEndHour: Number(e.target.value) } })}
        >
          {hours.slice(settings.dayStartHour + 1).map((h) => (
            <option key={h} value={h}>
              {formatClock(h * 60, settings.timeFormat)}
            </option>
          ))}
        </Select>
      </div>
      <p className={styles.hint}>Waking hours are highlighted on timelines and used to calculate free time.</p>
      <button
        type="button"
        className={ui.textButton}
        onClick={() => {
          const previous = state;
          dispatch({ type: 'state/replace', state: { ...createSeed(), settings } });
          notify('Sample data restored', previous);
        }}
      >
        Reset to sample data
      </button>
    </div>
  );
}
