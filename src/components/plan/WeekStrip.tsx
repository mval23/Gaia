import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { blocksByDate as blocksByDateSelector } from '../../store/selectors';
import { formatShortDate, weekDates, weekdayName } from '../../lib/dates';
import styles from './WeekStrip.module.css';

/** At most three dots: a heavy day should look heavy without being counted. */
const MAX_DOTS = 3;

interface Props {
  date: string;
  today: string;
  onPick: (date: string) => void;
}

/**
 * The week you are in, under the date. Each day switches the day you are
 * planning; the two links open the same week or month in the Calendar.
 */
export function WeekStrip({ date, today, onPick }: Props) {
  const { state } = useGaia();
  const week = useMemo(() => weekDates(date, state.settings.weekStart), [date, state.settings.weekStart]);
  const scheduled = useMemo(() => blocksByDateSelector(state), [state]);
  const hideNumbers = state.settings.hideNumbers || state.settings.gentleDayDate === date;

  return (
    <div className={styles.wrap}>
      <div className={styles.strip} role="group" aria-label="This week">
        {week.map((day) => {
          const blocks = hideNumbers ? 0 : Math.min(scheduled.get(day)?.length ?? 0, MAX_DOTS);
          return (
            <button
              key={day}
              type="button"
              className={styles.day}
              data-today={day === today || undefined}
              data-selected={day === date || undefined}
              aria-current={day === date ? 'date' : undefined}
              aria-label={`${weekdayName(day)} ${formatShortDate(day)}${
                blocks ? `, ${blocks} scheduled` : ''
              }`}
              onClick={() => onPick(day)}
            >
              <span className={styles.weekday} aria-hidden="true">
                {weekdayName(day, 'short').slice(0, 2)}
              </span>
              <span className={styles.number} aria-hidden="true">
                {Number(day.slice(8))}
              </span>
              <span className={styles.load} aria-hidden="true">
                {Array.from({ length: blocks }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.links}>
        <Link to={`/calendar?view=week&date=${date}`}>Week of {formatShortDate(week[0])} →</Link>
        <Link to={`/calendar?view=month&date=${date}`}>Month →</Link>
      </p>
    </div>
  );
}
