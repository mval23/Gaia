import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { blocksByDate as blocksByDateSelector } from '../../store/selectors';
import { formatMonthYear, formatShortDate, monthGrid, startOfWeek, weekdayOrder } from '../../lib/dates';
import styles from './MiniMonth.module.css';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A month at a glance for the corner of the day view. The week you are looking
 * at reads as a tinted band, today is the solid mark, and every cell opens that
 * week in the Calendar — so it answers "where am I in the month?" without
 * taking you out of the day unless you ask.
 */
export function MiniMonth({ date, today }: { date: string; today: string }) {
  const { state } = useGaia();
  const weekStart = state.settings.weekStart;
  const cells = useMemo(() => monthGrid(date, weekStart), [date, weekStart]);
  const scheduled = useMemo(() => blocksByDateSelector(state), [state]);
  const thisWeek = startOfWeek(date, weekStart);

  return (
    <nav className={styles.mini} aria-label={`${formatMonthYear(date)}, jump to a week`}>
      <div className={styles.head}>
        <Link className={styles.month} to={`/calendar?view=month&date=${date}`}>
          {formatMonthYear(date)}
        </Link>
      </div>
      <div className={styles.grid}>
        {weekdayOrder(weekStart).map((i) => (
          <span key={i} className={styles.weekday} aria-hidden="true">
            {LETTERS[i]}
          </span>
        ))}
        {cells.map(({ date: cell, inMonth }) => {
          const inWeek = startOfWeek(cell, weekStart) === thisWeek;
          const has = (scheduled.get(cell)?.length ?? 0) > 0;
          return (
            <Link
              key={cell}
              to={`/calendar?view=week&date=${cell}`}
              className={styles.day}
              data-out={!inMonth || undefined}
              data-week={inWeek || undefined}
              data-today={cell === today || undefined}
              data-has={has && !state.settings.hideNumbers ? true : undefined}
              aria-current={cell === today ? 'date' : undefined}
              aria-label={`${NAMES[new Date(`${cell}T00:00:00`).getDay()]} ${formatShortDate(cell)}${
                has ? ', has scheduled time' : ''
              } — open this week`}
            >
              {Number(cell.slice(8))}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
