import { useState } from 'react';
import type { Period } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { periodStart, reflectionFor } from '../../store/selectors';
import { COPY } from '../../lib/copy';
import styles from './lookback.module.css';

type Field = 'wentWell' | 'wasHard' | 'oneThing' | 'journal';

const PROMPTS: { field: Field; label: string; rows: number }[] = [
  { field: 'wentWell', label: 'What went okay, even something small?', rows: 2 },
  { field: 'wasHard', label: 'What felt heavy?', rows: 2 },
  { field: 'oneThing', label: 'Anything to make smaller, pause, or let go of next?', rows: 2 },
  { field: 'journal', label: 'Journal', rows: 4 },
];

/**
 * The same four questions for a week or a month. Every one is optional, and a
 * reflection nobody wrote in is never stored, so skipping leaves no trace.
 */
export function ReflectionCard({ period, date }: { period: Period; date: string }) {
  const { state, dispatch } = useGaia();
  const { announce } = useFeedback();
  const start = periodStart(state, period, date);
  const existing = reflectionFor(state, period, date);
  const [draft, setDraft] = useState<Record<Field, string>>({
    wentWell: existing?.wentWell ?? '',
    wasHard: existing?.wasHard ?? '',
    oneThing: existing?.oneThing ?? '',
    journal: existing?.journal ?? '',
  });

  const commit = (field: Field) => {
    const value = draft[field];
    if ((existing?.[field] ?? '') === value) return;
    dispatch({ type: 'reflection/save', id: uid('r'), weekStart: start, period, patch: { [field]: value } });
    if (value.trim()) announce(COPY.reflectionSaved);
  };

  return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.cardHead}>
        <h2 id="reflection-title" className="eyebrow">
          {period === 'month' ? 'Your month' : 'Your week'}
        </h2>
        <span className={styles.meta}>{existing ? 'saved' : 'saved as you write'}</span>
      </div>
      {PROMPTS.map(({ field, label, rows }) => (
        <label key={field} className={styles.prompt}>
          <span className={styles.promptLabel}>{label}</span>
          <textarea
            className={`field ${styles.promptInput}`}
            rows={rows}
            placeholder={field === 'journal' ? COPY.journalPrompt : undefined}
            value={draft[field]}
            onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
            onBlur={() => commit(field)}
          />
        </label>
      ))}
    </section>
  );
}
