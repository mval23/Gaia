import { Link } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { reflectionForWeek } from '../../store/selectors';
import { formatShortDate, weekDates } from '../../lib/dates';
import { COPY } from '../../lib/copy';
import { Icon } from '../ui/Icon';
import styles from './plan.module.css';

/**
 * The reflection itself lives on Look back now, where the week's own days are
 * there to read. Plan only offers it, on the day the person chose, in one line.
 */
export function ReflectionInvite({ date }: { date: string }) {
  const { state } = useGaia();
  const existing = reflectionForWeek(state, date);
  const week = weekDates(date, state.settings.weekStart);

  return (
    <Link className={styles.reflectionInvite} to={`/look-back?date=${date}`}>
      <Icon name="look" size={17} className={styles.reflectionInviteIcon} />
      <span className={styles.reflectionInviteText}>
        <span className={styles.reflectionInviteTitle}>{COPY.reflectionInvite}</span>
        <span className={styles.reflectionInviteMeta}>
          {formatShortDate(week[0])} – {formatShortDate(week[6])}
          {existing ? ' · you have started it' : ''}
        </span>
      </span>
      <Icon name="chevronRight" size={16} />
    </Link>
  );
}
