import { useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { reflectionForWeek } from '../../store/selectors';
import { formatShortDate, startOfWeek, weekDates } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import styles from './plan.module.css';

type Field = 'wentWell' | 'wasHard' | 'oneThing';

const PROMPTS: { field: Field; label: string }[] = [
  { field: 'wentWell', label: 'What went okay this week, even something small?' },
  { field: 'wasHard', label: 'What felt heavy?' },
  { field: 'oneThing', label: 'Anything to make smaller, pause, or let go of next week?' },
];

/**
 * Offered once a week, on a day the person picks. Every prompt is optional, and
 * an untouched reflection is never stored, so skipping a week leaves no trace.
 */
export function WeeklyReflection({ date }: { date: string }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const weekStart = startOfWeek(date, state.settings.weekStart);
  const existing = reflectionForWeek(state, date);
  const [draft, setDraft] = useState<Record<Field, string>>({
    wentWell: existing?.wentWell ?? '',
    wasHard: existing?.wasHard ?? '',
    oneThing: existing?.oneThing ?? '',
  });

  const commit = (field: Field) => {
    const value = draft[field];
    if ((existing?.[field] ?? '') === value) return;
    dispatch({ type: 'reflection/save', id: uid('r'), weekStart, patch: { [field]: value } });
    if (value.trim()) announce(COPY.reflectionSaved);
  };

  const week = weekDates(date, state.settings.weekStart);

  return (
    <section className={styles.reflection} aria-labelledby="reflection-title">
      <h2 id="reflection-title" className={styles.reflectionTitle}>
        {COPY.reflectionInvite}
      </h2>
      {PROMPTS.map(({ field, label }) => (
        <div key={field} className={styles.reflectionPrompt}>
          <label htmlFor={`reflection-${field}`}>{label}</label>
          <textarea
            id={`reflection-${field}`}
            className={`field ${styles.reflectionInput}`}
            value={draft[field]}
            onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
            onBlur={() => commit(field)}
          />
        </div>
      ))}
      <p className={styles.reflectionFoot}>
        <span>
          {formatShortDate(week[0])} – {formatShortDate(week[6])}
        </span>
        {existing && <span>Saved</span>}
      </p>
    </section>
  );
}
