import type { CheckInKind } from '../../types';
import { addDays, formatShortDate } from '../../lib/dates';
import { checkInKey } from '../../store/selectors';
import styles from './habits.module.css';

/**
 * Three weeks of small marks, oldest to today — the graphic from the reference
 * image. It lives on the habits page rather than in the day's planning panel,
 * where looking back would only get in the way of getting on with it.
 *
 * A day with nothing logged is an open circle: never a cross, never red.
 */
const DAYS = 21;

const DESCRIPTION: Record<CheckInKind, string> = {
  done: 'done',
  tiny: 'the tiny version',
  rest: 'a rest day',
};

export function DotHistory({
  habitId,
  date,
  log,
}: {
  habitId: string;
  date: string;
  log: Map<string, CheckInKind>;
}) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(date, -(DAYS - 1 - i)));
  const logged = days.filter((d) => log.get(checkInKey(habitId, d)));

  const summary = logged.length
    ? `Last three weeks: ${logged
        .map((d) => `${formatShortDate(d)} ${DESCRIPTION[log.get(checkInKey(habitId, d))!]}`)
        .join(', ')}`
    : 'Nothing logged in the last three weeks';

  return (
    <div className={styles.dots} role="img" aria-label={summary}>
      {days.map((day) => {
        const kind = log.get(checkInKey(habitId, day));
        return (
          <span
            key={day}
            className={styles.dot}
            data-kind={kind ?? 'none'}
            data-today={day === date || undefined}
            title={`${formatShortDate(day)}${kind ? ` · ${DESCRIPTION[kind]}` : ''}`}
          />
        );
      })}
    </div>
  );
}
