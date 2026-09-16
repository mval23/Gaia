import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { blocksByDate as blocksByDateSelector } from '../../store/selectors';
import {
  addMonths,
  formatMonthYear,
  formatShortDate,
  monthGrid,
  startOfWeek,
  weekdayOrder,
} from '../../lib/dates';
import { Icon } from '../ui/Icon';
import styles from './MiniMonth.module.css';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  /** The day currently being looked at. */
  value: string;
  today: string;
  /** Given, the grid picks a date and can browse months. Otherwise each cell links to that week. */
  onPick?: (date: string) => void;
}

/**
 * A month at a glance. The week you are on reads as a tinted band, today is the
 * solid mark, and a day with time on it carries a dot.
 *
 * Inside the date picker it picks a day; anywhere else each cell opens that
 * week in the Calendar.
 */
export function MiniMonth({ value, today, onPick }: Props) {
  const { state } = useGaia();
  const weekStart = state.settings.weekStart;
  const [cursor, setCursor] = useState(value);
  const month = onPick ? cursor : value;

  const cells = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
  const scheduled = useMemo(() => blocksByDateSelector(state), [state]);
  const thisWeek = startOfWeek(value, weekStart);

  return (
    <div className={styles.mini}>
      <div className={styles.head}>
        {onPick ? (
          <>
            <button
              type="button"
              className={styles.step}
              aria-label="Previous month"
              onClick={() => setCursor(addMonths(month, -1))}
            >
              <Icon name="chevronLeft" size={15} />
            </button>
            <span className={styles.month}>{formatMonthYear(month)}</span>
            <button
              type="button"
              className={styles.step}
              aria-label="Next month"
              onClick={() => setCursor(addMonths(month, 1))}
            >
              <Icon name="chevronRight" size={15} />
            </button>
          </>
        ) : (
          <Link className={styles.month} to={`/calendar?view=month&date=${month}`}>
            {formatMonthYear(month)}
          </Link>
        )}
      </div>

      <div className={styles.grid} role={onPick ? 'group' : undefined} aria-label={formatMonthYear(month)}>
        {weekdayOrder(weekStart).map((i, col) => (
          <span key={col} className={styles.weekday} aria-hidden="true">
            {LETTERS[i]}
          </span>
        ))}
        {cells.map(({ date: cell, inMonth }) => {
          const has = (scheduled.get(cell)?.length ?? 0) > 0 && !state.settings.hideNumbers;
          const label = `${NAMES[new Date(`${cell}T00:00:00`).getDay()]} ${formatShortDate(cell)}${
            has ? ', has scheduled time' : ''
          }`;
          const shared = {
            className: styles.day,
            'data-out': !inMonth || undefined,
            'data-week': startOfWeek(cell, weekStart) === thisWeek || undefined,
            'data-today': cell === today || undefined,
            'data-selected': cell === value || undefined,
            'data-has': has || undefined,
            'aria-current': cell === today ? ('date' as const) : undefined,
          };
          return onPick ? (
            <button key={cell} type="button" {...shared} aria-label={label} onClick={() => onPick(cell)}>
              {Number(cell.slice(8))}
            </button>
          ) : (
            <Link key={cell} {...shared} to={`/calendar?view=week&date=${cell}`} aria-label={`${label} — open this week`}>
              {Number(cell.slice(8))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
