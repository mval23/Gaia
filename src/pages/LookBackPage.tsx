import { useMemo } from 'react';
import type { DayShape, Period } from '../types';
import { useGaia } from '../store/GaiaProvider';
import { useDateParam, useParam } from '../hooks/useDateParam';
import {
  dayShape,
  lightFor,
  lightLogged,
  periodDates,
  periodStart,
  tendedIn,
  timeByCategory,
} from '../store/selectors';
import {
  addDays,
  addMonths,
  formatShortDate,
  monthName,
  startOfMonth,
  weekdayName,
} from '../lib/dates';
import { formatDuration } from '../lib/time';
import { COPY } from '../lib/copy';
import { paint } from '../lib/swatch';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import { ReflectionCard } from '../components/lookback/ReflectionCard';
import { MomentumCard } from '../components/lookback/MomentumCard';
import ui from '../components/ui/ui.module.css';
import styles from './LookBackPage.module.css';

const KIND_WORD = { done: 'done', tiny: 'the tiny version', rest: 'rest' } as const;

/**
 * Looking back: the period as it was, then what the person makes of it. Nothing
 * here is scored, nothing is compared to a plan, and a blank day stays blank.
 */
export function LookBackPage() {
  const { state } = useGaia();
  const { date, setDate, today } = useDateParam();
  const [periodRaw, setPeriod] = useParam('period');
  const period: Period = periodRaw === 'month' ? 'month' : 'week';

  const { settings } = state;
  const start = periodStart(state, period, date);
  const dates = useMemo(() => periodDates(state, period, date), [state, period, date]);
  const tended = useMemo(() => tendedIn(state, dates), [state, dates]);
  const slices = useMemo(() => timeByCategory(state, dates), [state, dates]);
  const totalMin = slices.reduce((n, s) => n + s.minutes, 0);
  const lights = dates.map((d) => ({ date: d, light: lightFor(state, d), shape: dayShape(state, d) }));
  const litDays = lights.filter(({ light }) => lightLogged(light)).length;
  const step = (n: number) => setDate(period === 'month' ? addMonths(date, n) : addDays(date, n * 7));

  const rangeLabel =
    period === 'month'
      ? `${monthName(date)} ${date.slice(0, 4)}`
      : `${formatShortDate(dates[0])} – ${formatShortDate(dates[6])}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>
            <Icon name="look" size={14} />
            Look back
          </p>
          <h1 className={styles.title}>
            {period === 'month' ? 'Your month, as it was' : COPY.lookBackInvite}
          </h1>
        </div>
        <div className={styles.controls}>
          <div className={styles.tabs} role="group" aria-label="Period">
            <button
              type="button"
              className={styles.tab}
              aria-pressed={period === 'week'}
              onClick={() => setPeriod(null)}
            >
              Week
            </button>
            <button
              type="button"
              className={styles.tab}
              aria-pressed={period === 'month'}
              onClick={() => setPeriod('month')}
            >
              Month
            </button>
          </div>
          <div className={styles.range}>
            <button type="button" className={styles.arrow} aria-label="Earlier" onClick={() => step(-1)}>
              <Icon name="chevronLeft" size={18} />
            </button>
            <span className={styles.rangeLabel}>{rangeLabel}</span>
            <button type="button" className={styles.arrow} aria-label="Later" onClick={() => step(1)}>
              <Icon name="chevronRight" size={18} />
            </button>
          </div>
          {start !== periodStart(state, period, today) && (
            <button type="button" className={ui.pillButton} onClick={() => setDate(today)}>
              {period === 'month' ? 'This month' : 'This week'}
            </button>
          )}
        </div>
      </header>

      <div className={styles.columns}>
        <section
          className={`${styles.card} ${period === 'month' ? styles.month : styles.week}`}
          aria-labelledby="period-itself"
        >
          <div className={styles.cardHead}>
            <h2 id="period-itself" className="eyebrow">
              {period === 'month' ? 'The month itself' : 'The week itself'}
            </h2>
            <span className={styles.meta}>nothing here is scored</span>
          </div>

          <div className={styles.band}>
            <div className={period === 'month' ? styles.monthLights : styles.weekLights}>
              {lights.map(({ date: d, light, shape }) => (
                <div key={d} className={styles.lightDay}>
                  {period === 'week' && <span className={styles.meta}>{weekdayName(d, 'short')}</span>}
                  <span
                    className={styles.lightSquare}
                    data-shape={lightLogged(light) ? (shape as DayShape) : undefined}
                    title={`${formatShortDate(d)}${lightLogged(light) ? `: ${light?.energy ?? 'no'} energy` : ': not logged'}`}
                  />
                  {period === 'week' && <span className={styles.meta}>{light?.energy ?? '—'}</span>}
                </div>
              ))}
            </div>
            <p className={styles.note}>
              {litDays === 0
                ? COPY.lookBackEmpty
                : `The light, morning by morning. ${dates.length - litDays} ${
                    dates.length - litDays === 1 ? 'day' : 'days'
                  } left blank.`}
            </p>
          </div>

          {tended.length > 0 && (
            <>
              <div className={styles.rule} />
              <div className={styles.band}>
                <h3 className={styles.bandTitle}>What you tended</h3>
                <ul className={styles.tendedList}>
                  {tended.map(({ habit, days, count }) => (
                    <li key={habit.id} className={styles.tendedRow}>
                      <span className={styles.tendedName}>{habit.title}</span>
                      <span className={styles.dots} aria-hidden="true">
                        {days.map((kind, i) => (
                          <span key={i} data-kind={kind} title={kind ? KIND_WORD[kind] : undefined} />
                        ))}
                      </span>
                      {!settings.hideNumbers && (
                        <span className={styles.meta}>
                          {count} {count === 1 ? 'day' : 'days'} tended
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className={styles.note}>Full: done · pale: the tiny version · lavender: rest.</p>
              </div>
            </>
          )}

          {totalMin > 0 && !settings.hideNumbers && (
            <>
              <div className={styles.rule} />
              <div className={styles.band}>
                <h3 className={styles.bandTitle}>Where the time went</h3>
                <div className={styles.bar} aria-hidden="true">
                  {slices.map((slice) => (
                    <span
                      key={slice.key}
                      style={{
                        width: `${(slice.minutes / totalMin) * 100}%`,
                        background: slice.key === 'rest' ? 'var(--rest)' : paint(slice.color) ?? 'var(--tint-strong)',
                      }}
                    />
                  ))}
                </div>
                <ul className={styles.legend}>
                  {slices.map((slice) => (
                    <li key={slice.key}>
                      <span
                        className={styles.legendDot}
                        style={{
                          background: slice.key === 'rest' ? 'var(--rest)' : paint(slice.color) ?? 'var(--tint-strong)',
                        }}
                      />
                      {slice.name} · {formatDuration(slice.minutes)}
                    </li>
                  ))}
                </ul>
                <p className={styles.note}>The hours you placed, and where they went. Nothing compares them to a plan.</p>
              </div>
            </>
          )}

          <MonetAccent art="pond" phrase="one week at a time" className={styles.accent} />
        </section>

        <div className={styles.side}>
          <ReflectionCard period={period} date={date} />
          {period === 'week' && <MomentumCard weekStart={start} date={date} />}
          {period === 'month' && (
            <section className={styles.card} aria-labelledby="month-weeks">
              <div className={styles.cardHead}>
                <h2 id="month-weeks" className="eyebrow">
                  Weeks behind it
                </h2>
              </div>
              <ul className={styles.weekList}>
                {state.reflections
                  .filter((r) => r.period === 'week' && r.weekStart.startsWith(startOfMonth(date).slice(0, 7)))
                  .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
                  .map((r) => (
                    <li key={r.id}>
                      <button type="button" className={ui.textButton} onClick={() => { setPeriod(null); setDate(r.weekStart); }}>
                        Week of {formatShortDate(r.weekStart)}
                      </button>
                      <span className={styles.meta}>{r.oneThing ?? r.wentWell ?? r.journal}</span>
                    </li>
                  ))}
                {state.reflections.filter((r) => r.period === 'week' && r.weekStart.startsWith(startOfMonth(date).slice(0, 7))).length === 0 && (
                  <li className={styles.note}>No weeks written yet this month.</li>
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
