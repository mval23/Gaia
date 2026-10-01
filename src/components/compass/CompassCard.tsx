import { useRef, useState } from 'react';
import type { Value } from '../../types';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { useCollapsed } from '../../hooks/useCollapsed';
import { useGoalEditor, useHabitEditor } from '../../hooks/useSheetParam';
import { compassWritten, pointingAt, pointingCount } from '../../store/selectors';
import { valueSuggestions } from '../../data/compass';
import { formatShortDate, toISODate } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import ui from '../ui/ui.module.css';
import styles from './compass.module.css';

const FOLDED = 'compass';

/**
 * The first thing on Goals & habits, and the only new thing on it: a sentence,
 * a few words, and who you are to people right now. Everything is optional,
 * and left empty it folds to one line and stops asking.
 */
export function CompassCard() {
  const { state } = useGaia();
  const { isCollapsed, toggle } = useCollapsed();
  const [opened, setOpened] = useState(false);
  const headingRef = useRef<HTMLTextAreaElement>(null);
  const written = compassWritten(state);

  if (!written && !opened) {
    if (isCollapsed(FOLDED)) {
      return (
        <p className={styles.folded}>
          <Icon name="compass" size={15} className={styles.lensIcon} />
          {COPY.compassFolded}
          <button type="button" className={ui.textButton} onClick={() => setOpened(true)}>
            Open it
          </button>
        </p>
      );
    }
    return (
      <section className={styles.card} aria-labelledby="compass-title">
        <Head />
        <p className={styles.invite}>{COPY.compassInvite}</p>
        <div className={styles.inviteActions}>
          <button
            type="button"
            className={ui.secondaryButton}
            onClick={() => {
              setOpened(true);
              requestAnimationFrame(() => headingRef.current?.focus());
            }}
          >
            Write a sentence
          </button>
          <button type="button" className={ui.pillButton} onClick={() => toggle(FOLDED, true)}>
            Not now
          </button>
        </div>
        <p className={styles.note}>Left empty, it folds away to one line.</p>
      </section>
    );
  }

  return <Compass headingRef={headingRef} />;
}

function Head() {
  return (
    <div className={styles.head}>
      <Icon name="compass" size={16} className={styles.lensIcon} />
      <h2 id="compass-title" className="eyebrow">
        Compass
      </h2>
    </div>
  );
}

function Compass({ headingRef }: { headingRef: React.RefObject<HTMLTextAreaElement> }) {
  const { state, dispatch } = useGaia();
  const { settings, compass } = state;
  const [draft, setDraft] = useState('');
  const [lens, setLens] = useState<string | null>(null);
  const suggestions = valueSuggestions(state);

  /** "Steadiness, a pace I can keep" — the note after a comma, a middot or a colon. */
  const keep = (text: string) => {
    const [word, ...rest] = text.split(/[,·:]/);
    if (!word.trim()) return;
    dispatch({ type: 'value/add', id: uid('val'), word, note: rest.join(' ').trim() || undefined });
    setDraft('');
  };

  return (
    <section className={styles.card} aria-labelledby="compass-title">
      <div className={styles.head}>
        <Icon name="compass" size={16} className={styles.lensIcon} />
        <h2 id="compass-title" className="eyebrow">
          Compass
        </h2>
        <span className={styles.meta}>saved as you write</span>
      </div>

      <label className={styles.field}>
        <span className="visually-hidden">{COPY.compassHeading}</span>
        <textarea
          ref={headingRef}
          className={`field ${styles.heading}`}
          rows={2}
          placeholder={COPY.compassHeading}
          value={compass.heading ?? ''}
          onChange={(e) => dispatch({ type: 'compass/update', patch: { heading: e.target.value } })}
        />
        <span className={styles.note}>{COPY.compassHeadingNote}</span>
      </label>

      <div className={styles.values} role="group" aria-label={COPY.compassValues}>
        {compass.values.map((value) => (
          <ValueChip
            key={value.id}
            value={value}
            open={lens === value.id}
            onOpen={() => setLens(lens === value.id ? null : value.id)}
          />
        ))}
      </div>

      {lens && <ValueLens id={lens} onClose={() => setLens(null)} />}

      <div className={styles.add}>
        <label className={styles.addField}>
          <span className="visually-hidden">{COPY.compassValues}</span>
          <input
            className="field"
            placeholder={COPY.valuePlaceholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              keep(draft);
            }}
          />
        </label>
        <button type="button" className={ui.secondaryButton} disabled={!draft.trim()} onClick={() => keep(draft)}>
          Keep it
        </button>
      </div>

      {suggestions.length > 0 && (
        <p className={styles.suggests}>
          <span className={styles.note}>{COPY.valueSuggest}</span>
          {suggestions.map((word) => (
            <button key={word} type="button" className={styles.suggest} onClick={() => keep(word)}>
              {word}
            </button>
          ))}
        </p>
      )}

      <label className={styles.field}>
        <span className={styles.note}>{COPY.compassRoles}</span>
        <input
          className="field"
          placeholder="daughter · analyst · student · friend"
          defaultValue={compass.roles.join(' · ')}
          onBlur={(e) =>
            dispatch({ type: 'compass/update', patch: { roles: e.target.value.split(/[,·]/).map((r) => r.trim()) } })
          }
        />
        <span className={styles.note}>
          {COPY.compassRolesNote}
          {!settings.hideNumbers && !Number.isNaN(Date.parse(compass.updatedAt))
            ? ` As of ${formatShortDate(toISODate(new Date(compass.updatedAt)))}.`
            : ''}
        </span>
      </label>
    </section>
  );
}

function ValueChip({ value, open, onOpen }: { value: Value; open: boolean; onOpen: () => void }) {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const points = pointingCount(state, value.id);

  const letGo = () => {
    const previous = state;
    dispatch({ type: 'value/remove', id: value.id });
    notify(
      points === 0
        ? `Let go of ${value.word}.`
        : `Let go of ${value.word}. The ${points} ${points === 1 ? 'thing' : 'things'} that pointed at it stayed where they were.`,
      previous,
    );
  };

  return (
    <span className={styles.chip} data-open={open || undefined}>
      <button type="button" className={styles.chipButton} aria-expanded={open} onClick={onOpen}>
        <b>{value.word}</b>
        {value.note && <span className={styles.meta}>{value.note}</span>}
      </button>
      <button type="button" className={styles.drop} aria-label={`Let go of ${value.word}`} onClick={letGo}>
        <Icon name="close" size={13} />
      </button>
    </span>
  );
}

/** What points at one value. A reading, never a folder: nothing is inside it. */
function ValueLens({ id, onClose }: { id: string; onClose: () => void }) {
  const { state } = useGaia();
  const { openGoal } = useGoalEditor();
  const { openHabit } = useHabitEditor();
  const value = state.compass.values.find((v) => v.id === id);
  if (!value) return null;
  const { goals, habits } = pointingAt(state, value.id);
  const count = goals.length + habits.length;

  return (
    <div className={styles.lens}>
      <div className={styles.head}>
        <Icon name="compass" size={15} className={styles.lensIcon} />
        <h3 className="eyebrow">{value.word}</h3>
        {!state.settings.hideNumbers && count > 0 && (
          <span className={styles.meta}>
            {count} {count === 1 ? 'thing points' : 'things point'} at it
          </span>
        )}
        <button type="button" className={`${ui.iconButton} ${ui.iconButtonSm}`} aria-label="Close" onClick={onClose}>
          <Icon name="close" size={15} />
        </button>
      </div>
      {value.note && <p className={styles.lensNote}>{value.note}</p>}
      {count === 0 ? (
        <p className={styles.note}>{COPY.lensEmpty}</p>
      ) : (
        <div className={styles.points}>
          {goals.map((goal) => (
            <button key={goal.id} type="button" className={styles.point} onClick={() => openGoal(goal.id)}>
              <Icon name="goal" size={13} />
              {goal.title}
            </button>
          ))}
          {habits.map((habit) => (
            <button key={habit.id} type="button" className={styles.point} onClick={() => openHabit(habit.id)}>
              <Icon name="rhythm" size={13} />
              {habit.title}
            </button>
          ))}
        </div>
      )}
      <p className={styles.note}>{COPY.lensNote}</p>
    </div>
  );
}
