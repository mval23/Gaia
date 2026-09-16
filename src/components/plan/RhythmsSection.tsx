import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { checkInIndex, habitsForDate, weekAimMet } from '../../store/selectors';
import { useHabitEditor } from '../../hooks/useSheetParam';
import { COPY } from '../../lib/copy';
import { HabitRow } from '../habits/HabitRow';
import styles from '../habits/habits.module.css';

interface Props {
  date: string;
  groupFilter: string;
  gentle: boolean;
}

/** Today's rhythms: the habits that belong to this day, and how they are going. */
export function RhythmsSection({ date, groupFilter, gentle }: Props) {
  const { state } = useGaia();
  const { openHabit } = useHabitEditor();
  // One index per render: the selectors are plain, so a per-row scan would be costly.
  const log = useMemo(() => checkInIndex(state), [state.checkIns]);

  const habits = habitsForDate(state, date, groupFilter);
  // A habit that has already met its week sorts last, with an affirming note.
  const sorted = useMemo(
    () => [...habits].sort((a, b) => Number(weekAimMet(state, a, date)) - Number(weekAimMet(state, b, date))),
    [habits, state, date],
  );

  const hasAnyHabit = state.habits.length > 0;

  return (
    <section className={styles.section} aria-labelledby="rhythms-title">
      <div className={styles.sectionHead}>
        <h2 id="rhythms-title" className="eyebrow">
          Rhythms
        </h2>
        {hasAnyHabit && sorted.length > 0 && !state.settings.hideNumbers && (
          <span className={styles.sectionMeta}>
            {sorted.length} {sorted.length === 1 ? 'habit' : 'habits'} today
          </span>
        )}
      </div>

      {!hasAnyHabit ? (
        <p className={styles.empty}>
          {COPY.rhythmsEmpty} <Link to="/manage/habits">Add a habit</Link>
        </p>
      ) : sorted.length === 0 ? (
        <p className={styles.empty}>{COPY.rhythmsDone}</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((habit) => (
            <HabitRow key={habit.id} habit={habit} date={date} log={log} gentle={gentle} onEdit={openHabit} />
          ))}
        </ul>
      )}
    </section>
  );
}
