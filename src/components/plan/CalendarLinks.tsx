import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { formatShortDate, weekDates } from '../../lib/dates';
import styles from './CalendarLinks.module.css';

/** Two quiet ways out of the day: the same week, or the month around it. */
export function CalendarLinks({ date }: { date: string }) {
  const { state } = useGaia();
  const week = weekDates(date, state.settings.weekStart);

  return (
    <p className={styles.links}>
      <Link to={`/calendar?view=week&date=${date}`}>Week of {formatShortDate(week[0])} →</Link>
      <Link to={`/calendar?view=month&date=${date}`}>Month →</Link>
    </p>
  );
}
