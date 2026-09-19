import { useState } from 'react';
import { uid, useFeedback, useGaia } from '../../store/GaiaProvider';
import { categoryById, groupById } from '../../store/selectors';
import { STARTER_HABITS, hasHabitNamed, starterCategoryId } from '../../data/starterHabits';
import { rhythmLabel } from '../../lib/rhythm';
import { formatClock } from '../../lib/time';
import { Icon } from '../ui/Icon';
import settings from '../../pages/SettingsPage.module.css';
import styles from './StarterHabits.module.css';

const COUNT_WORD = ['', 'this habit', 'these two', 'these three'];

/**
 * Three habits to begin with. Each can be picked or left, and nothing here is
 * a commitment: every one can be changed or let go afterwards.
 */
export function StarterHabits() {
  const { state, dispatch } = useGaia();
  const { notify } = useFeedback();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(STARTER_HABITS.map((h) => h.key)));
  const categoryId = starterCategoryId(state);
  const category = categoryById(state, categoryId);
  const group = category ? groupById(state, category.groupId) : undefined;

  const offered = STARTER_HABITS.map((h) => ({ ...h, owned: hasHabitNamed(state, h.title) }));
  const chosen = offered.filter((h) => picked.has(h.key) && !h.owned);
  if (offered.every((h) => h.owned)) return null;

  const toggle = (key: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = () => {
    if (!categoryId || chosen.length === 0) return;
    const previous = state;
    for (const { key: _key, title, rhythm, ...rest } of chosen) {
      const id = uid('h');
      dispatch({ type: 'habit/add', id, categoryId, title, rhythm });
      dispatch({ type: 'habit/update', id, patch: rest });
    }
    notify(
      chosen.length === 1 ? `“${chosen[0].title}” added to your rhythms` : `${chosen.length} habits added to your rhythms`,
      previous,
    );
  };

  return (
    <section className={`${settings.group} ${settings.wide}`} aria-labelledby="starter-habits">
      <h2 id="starter-habits" className={settings.groupTitle}>
        Start with a few habits
      </h2>
      <p className={settings.hint}>
        Three habits to begin with, each with a tiny version for hard days. Pick any. You can change or let go of every
        one of them afterwards.
      </p>
      <div className={styles.grid}>
        {offered.map((h) => {
          const on = picked.has(h.key) && !h.owned;
          return (
            <button
              key={h.key}
              type="button"
              className={styles.card}
              aria-pressed={on}
              disabled={h.owned}
              onClick={() => toggle(h.key)}
            >
              <span className={styles.cardHead}>
                <span className={styles.box} aria-hidden="true">
                  {on && <Icon name="check" size={13} strokeWidth={2.2} />}
                </span>
                <span className={styles.title}>{h.title}</span>
              </span>
              <span className={styles.meta}>
                {rhythmLabel(h.rhythm)}
                {h.preferredStartMin !== undefined
                  ? ` · around ${formatClock(h.preferredStartMin, state.settings.timeFormat)}`
                  : ''}
              </span>
              <span className={styles.cue}>{h.cue}</span>
              <span className={styles.tiny}>Tiny: {h.tinyVersion}</span>
              {h.owned && <span className={styles.owned}>Already one of yours</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.foot}>
        <button
          type="button"
          className={styles.add}
          disabled={chosen.length === 0 || !categoryId}
          onClick={add}
        >
          {chosen.length === 0 ? 'Pick one to add' : `Add ${COUNT_WORD[chosen.length]}`}
        </button>
        {category && (
          <span className={settings.hint}>
            They go into {group ? `${group.name} · ` : ''}
            {category.name}, with no goal linked.
          </span>
        )}
      </div>
    </section>
  );
}
