import { useState } from 'react';
import type { PatternVerdict } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { PATTERN_DAYS, nextPattern } from '../../lib/patterns';
import { todayISO } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './lookback.module.css';

const OUTCOME: Record<PatternVerdict, string> = {
  true: COPY.patternYes,
  'not-really': COPY.patternNo,
  unsure: COPY.patternUnsure,
};

/**
 * Something Gaia can see in the person's own rows, drawn dashed like every
 * other suggestion and asked as a question. It never says what it means, and
 * only "That's true" keeps it — as an observation of theirs, not Gaia's.
 */
export function PatternCard() {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const today = todayISO();
  // Chosen once: answering one question should not immediately bring another.
  const [pattern] = useState(() => nextPattern(state, today));
  const [answer, setAnswer] = useState<PatternVerdict | null>(null);

  if (!pattern) return null;

  const say = (verdict: PatternVerdict) => {
    const previous = state;
    const keep =
      verdict === 'true' ? { id: uid('ev'), title: pattern.observation, note: COPY.patternKept } : undefined;
    dispatch({ type: 'pattern/answer', id: pattern.id, verdict, date: today, keep });
    setAnswer(verdict);
    if (verdict === 'true') notify(OUTCOME[verdict], previous);
    else announce(OUTCOME[verdict]);
  };

  return (
    <section className={styles.pattern} aria-labelledby="pattern-title">
      <div className={styles.cardHead}>
        <h2 id="pattern-title" className="eyebrow">
          <Icon name="compass" size={14} className={styles.patternIcon} />
          {COPY.patternTitle}
        </h2>
        <span className={styles.meta}>from your last {PATTERN_DAYS} days</span>
      </div>

      <p className={styles.patternQuestion}>{pattern.question}</p>
      {!state.settings.hideNumbers && <p className={styles.meta}>{pattern.evidence}</p>}

      {answer ? (
        <p className={styles.patternOutcome}>{OUTCOME[answer]}</p>
      ) : (
        <div className={styles.picks} role="group" aria-labelledby="pattern-title">
          <button type="button" className={styles.pick} onClick={() => say('true')}>
            That’s true
          </button>
          <button type="button" className={styles.pick} onClick={() => say('not-really')}>
            Not really
          </button>
          <button type="button" className={styles.pick} onClick={() => say('unsure')}>
            Not sure
          </button>
        </div>
      )}

      <p className={styles.meta}>{COPY.patternNote}</p>
    </section>
  );
}
