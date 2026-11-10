import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { CheckInKind, Habit } from '../types';
import { useFeedback, useGaia } from '../store/GaiaProvider';
import { useHabitEditor } from '../hooks/useSheetParam';
import {
  categoryById,
  checkInIndex,
  checkInKey,
  goalById,
  groupById,
  habitStart,
  habitTally,
  habitTimes,
  isHabitResting,
  totalCount,
  valueById,
} from '../store/selectors';
import { WEEKS_SHOWN, canFill, monthsBetween, weeksEnding } from '../lib/habitDays';
import {
  formatLongDate,
  formatShortDate,
  monthDates,
  monthName,
  todayISO,
  weekdayName,
} from '../lib/dates';
import { formatClock, formatDuration } from '../lib/time';
import { rhythmLabel, weeklyTarget } from '../lib/rhythm';
import { paint } from '../lib/swatch';
import { Icon } from '../components/ui/Icon';
import { MonetAccent } from '../components/art/MonetAccent';
import { HABIT_DEFAULT_MIN } from '../store/selectors';
import ui from '../components/ui/ui.module.css';
import styles from './HabitPage.module.css';

const WORD: Record<CheckInKind, string> = {
  done: 'done',
  tiny: 'the tiny version',
  rest: 'rest, on purpose',
};

/** The four answers a day can have. The fourth clears it, and is never "undo". */
const ANSWERS: { kind: CheckInKind | null; label: string }[] = [
  { kind: 'done', label: 'Done' },
  { kind: 'tiny', label: 'The tiny version' },
  { kind: 'rest', label: 'Rest, on purpose' },
  { kind: null, label: 'Leave it blank' },
];

/**
 * A habit's own page: what it is, every day it has had, and the one thing it
 * asks of you today. Days that have gone are filled in here, and a day filled
 * in late is stored exactly like one tapped at the time.
 */
export function HabitPage() {
  const { habitId } = useParams();
  const { state } = useGaia();
  const habit = state.habits.find((h) => h.id === habitId);

  if (!habit) return <Navigate to="/goals" replace />;
  return <Page key={habit.id} habit={habit} />;
}

function Page({ habit }: { habit: Habit }) {
  const { state, dispatch } = useGaia();
  const { notify, announce } = useFeedback();
  const { openHabit } = useHabitEditor();
  const { settings } = state;
  const today = todayISO();
  const start = habitStart(state, habit);
  const [chosen, setChosen] = useState(today);

  const log = checkInIndex(state);
  const kindOn = (date: string) => log.get(checkInKey(habit.id, date));
  const weeks = useMemo(
    () => weeksEnding(today, WEEKS_SHOWN, settings.weekStart),
    [today, settings.weekStart],
  );
  const shown = useMemo(() => weeks.flat().filter((d) => canFill(d, start, today)), [weeks, start, today]);
  const tally = habitTally(state, habit.id, shown);
  const total = totalCount(state, habit.id);
  const thisWeek = habitTally(state, habit.id, weeks[weeks.length - 1].filter((d) => d <= today)).tended;
  const target = weeklyTarget(habit.rhythm);
  const months = useMemo(() => monthsBetween(start, today), [start, today]);
  const category = categoryById(state, habit.categoryId);
  const group = groupById(state, category?.groupId ?? '');
  const goal = goalById(state, habit.goalId);
  const value = valueById(state, habit.valueId);
  const resting = isHabitResting(state, habit);
  const hours = habitTimes(state, habit.id).filter((t) => t.date <= today).slice(0, 3);
  const cat = paint(category?.color) ?? 'var(--swatch-mist)';

  /** One day, one answer. Choosing again replaces it; blank clears it. */
  const answer = (date: string, kind: CheckInKind | null) => {
    if (kind) dispatch({ type: 'checkin/set', habitId: habit.id, date, kind });
    else dispatch({ type: 'checkin/clear', habitId: habit.id, date });
    const when = date === today ? 'today' : formatShortDate(date);
    announce(`${habit.title}, ${when}: ${kind ? WORD[kind] : 'left blank'}`);
  };

  const chosenKind = kindOn(chosen);
  const chosenLabel = chosen === today ? 'Today' : formatLongDate(chosen);

  return (
    <div className={styles.page} style={{ ['--cat' as string]: cat }}>
      <Link to="/goals" className={styles.back}>
        <Icon name="chevronLeft" size={15} />
        Goals &amp; habits
      </Link>

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className="eyebrow">
            <Icon name="rhythm" size={14} /> A habit
          </p>
          <h1 className={styles.title}>{habit.title}</h1>
          <div className={styles.chips}>
            <span className={styles.chip}>{rhythmLabel(habit.rhythm)}</span>
            {habit.preferredStartMin !== undefined && (
              <span className={styles.chip}>
                <Icon name="clock" size={13} />
                around {formatClock(habit.preferredStartMin, settings.timeFormat)} ·{' '}
                {formatDuration(habit.preferredDurationMin ?? HABIT_DEFAULT_MIN)}
              </span>
            )}
            {category && (
              <span className={styles.chip}>
                {group ? `${group.name} · ` : ''}
                {category.name}
              </span>
            )}
            {goal && (
              <Link className={styles.chip} to="/goals">
                <Icon name="goal" size={13} />
                {goal.title}
              </Link>
            )}
            {value && (
              <span className={`${styles.chip} ${styles.chipLens}`}>
                <Icon name="compass" size={13} />
                {value.word}
              </span>
            )}
            {resting && <span className={styles.chip}>resting for now</span>}
          </div>
        </div>
        <MonetAccent art="garden" variant="strip" fill phrase="slow is still moving" className={styles.accent} />
      </header>

      <div className={styles.columns}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="habit-today">
            <div className={styles.cardHead}>
              <h2 id="habit-today" className="eyebrow">
                Today · {formatLongDate(today)}
              </h2>
              <span className={styles.meta}>{kindOn(today) ? WORD[kindOn(today)!] : 'nothing logged yet'}</span>
            </div>
            <div className={styles.answers}>
              {ANSWERS.filter((a) => a.kind || kindOn(today)).map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className={`${ui.pillButton} ${a.kind === 'done' ? styles.primaryAnswer : ''}`}
                  aria-pressed={a.kind ? kindOn(today) === a.kind : undefined}
                  onClick={() => {
                    answer(today, a.kind);
                    setChosen(today);
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {habit.tinyVersion && (
              <p className={styles.note}>
                The tiny version here is <em>{habit.tinyVersion}</em>. It counts in full.
              </p>
            )}
          </section>

          <section className={styles.card} aria-labelledby="habit-weeks">
            <div className={styles.cardHead}>
              <h2 id="habit-weeks" className="eyebrow">
                The last {WEEKS_SHOWN} weeks
              </h2>
              <span className={styles.meta}>choose any day to fill it in</span>
            </div>

            <div className={styles.grid} role="group" aria-label={`Days of ${habit.title}`}>
              <span className={styles.corner} />
              {weeks[0].map((d) => (
                <span key={d} className={styles.dayName} aria-hidden="true">
                  {weekdayName(d, 'short')}
                </span>
              ))}
              {weeks.map((week) => (
                <WeekRow
                  key={week[0]}
                  week={week}
                  habit={habit}
                  today={today}
                  start={start}
                  chosen={chosen}
                  kindOn={kindOn}
                  onChoose={setChosen}
                />
              ))}
            </div>

            <Key />

            <div className={styles.chosen}>
              <div className={styles.cardHead}>
                <h3 className={styles.chosenTitle}>{chosenLabel}</h3>
                <span className={styles.meta}>{chosenKind ? WORD[chosenKind] : 'nothing logged'}</span>
              </div>
              <div className={styles.answers}>
                {ANSWERS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className={`${ui.pillButton} ${a.kind === 'done' ? styles.primaryAnswer : ''}`}
                    aria-pressed={a.kind ? chosenKind === a.kind : undefined}
                    disabled={!a.kind && !chosenKind}
                    onClick={() => answer(chosen, a.kind)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className={styles.note}>
                Filled in whenever, and it counts the same. Nothing is marked as late, and a day you leave blank
                stays blank.
              </p>
            </div>
          </section>

          {!settings.hideNumbers && (
            <section className={styles.card} aria-labelledby="habit-count">
              <h2 id="habit-count" className="eyebrow">
                What it adds up to
              </h2>
              <p className={styles.adds}>
                {tally.tended} {tally.tended === 1 ? 'time' : 'times'} in these {WEEKS_SHOWN} weeks, and {total} since{' '}
                {formatShortDate(start)}.
              </p>
              <p className={styles.meta}>
                {tally.tiny} of them the tiny version · {tally.rest}{' '}
                {tally.rest === 1 ? 'day' : 'days'} of rest, on purpose · {thisWeek} this week, against a rhythm of{' '}
                {habit.rhythm.type === 'timesPerWeek' ? `about ${target}` : target}.
              </p>
              <p className={styles.note}>No percentage, and no “x of 30”: there is nothing here to fall short of.</p>
            </section>
          )}

          <section className={styles.card} aria-labelledby="habit-months">
            <div className={styles.cardHead}>
              <h2 id="habit-months" className="eyebrow">
                All of it, month by month
              </h2>
              <span className={styles.meta}>since {formatShortDate(start)}</span>
            </div>
            {months.map((month) => (
              <MonthRow
                key={month}
                month={month}
                today={today}
                start={start}
                kindOn={kindOn}
                hideNumbers={settings.hideNumbers}
              />
            ))}
          </section>
        </div>

        <div className={styles.side}>
          {habit.preferredStartMin !== undefined && (
            <section className={styles.card} aria-labelledby="habit-hour">
              <div className={styles.cardHead}>
                <h2 id="habit-hour" className="eyebrow">
                  <Icon name="clock" size={14} /> Its hour
                </h2>
              </div>
              <p className={styles.sideLine}>
                Around <b>{formatClock(habit.preferredStartMin, settings.timeFormat)}</b>, usually{' '}
                <b>{formatDuration(habit.preferredDurationMin ?? HABIT_DEFAULT_MIN)}</b>.
              </p>
              {hours.length > 0 && (
                <p className={styles.meta}>
                  Moved on {hours.length} {hours.length === 1 ? 'day' : 'days'}, each on that day alone:{' '}
                  {hours
                    .map((t) => `${formatShortDate(t.date)} at ${formatClock(t.startMin, settings.timeFormat)}`)
                    .join(', ')}
                  .
                </p>
              )}
            </section>
          )}

          <section className={styles.card} aria-labelledby="habit-helps">
            <h2 id="habit-helps" className="eyebrow">
              What helps
            </h2>
            {habit.why && <p className={styles.why}>“{habit.why}”</p>}
            {habit.cue && <Line label="Cue" text={habit.cue} />}
            {habit.tinyVersion && <Line label="The tiny version" text={habit.tinyVersion} />}
            {habit.ifThen
              ?.filter((p) => p.when.trim() || p.then.trim())
              .map((p, i) => <Line key={i} label={`If ${p.when}`} text={`then ${p.then}`} />)}
            {habit.comingBack && <Line label="Coming back" text={habit.comingBack} />}
            {!habit.why && !habit.cue && !habit.tinyVersion && !habit.comingBack && (
              <p className={styles.note}>Nothing written yet, and the habit works without any of it.</p>
            )}
            <button type="button" className={ui.secondaryButton} onClick={() => openHabit(habit.id)}>
              Edit details
            </button>
          </section>

          <section className={`${styles.card} ${styles.quiet}`} aria-labelledby="habit-quiet">
            <h2 id="habit-quiet" className="eyebrow">
              Quietly
            </h2>
            <div className={styles.answers}>
              <button
                type="button"
                className={ui.pillButton}
                onClick={() => {
                  dispatch({
                    type: 'habit/update',
                    id: habit.id,
                    patch: { status: habit.status === 'active' ? 'paused' : 'active' },
                  });
                  announce(habit.status === 'active' ? `${habit.title} is resting` : `${habit.title} is active again`);
                }}
              >
                {habit.status === 'active' ? 'Let it rest for now' : 'Pick it up again'}
              </button>
              <button
                type="button"
                className={ui.pillButton}
                onClick={() => {
                  const previous = state;
                  dispatch({ type: 'habit/delete', id: habit.id });
                  notify(`“${habit.title}” deleted, along with its history`, previous);
                }}
              >
                Delete
              </button>
            </div>
            <p className={styles.note}>
              Resting keeps every day you have logged. Deleting takes its history with it, and the undo lasts as long
              as the message does.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.line}>
      <span className={styles.meta}>{label}</span>
      <span>{text}</span>
    </div>
  );
}

/** One week of the fill-in grid: the week's first day, then its seven circles. */
function WeekRow({
  week,
  habit,
  today,
  start,
  chosen,
  kindOn,
  onChoose,
}: {
  week: string[];
  habit: Habit;
  today: string;
  start: string;
  chosen: string;
  kindOn: (date: string) => CheckInKind | undefined;
  onChoose: (date: string) => void;
}) {
  return (
    <>
      <span className={styles.weekLabel}>{formatShortDate(week[0])}</span>
      {week.map((date) => {
        const kind = kindOn(date);
        const open = canFill(date, start, today);
        return (
          <button
            key={date}
            type="button"
            className={styles.day}
            data-kind={kind}
            data-today={date === today || undefined}
            data-chosen={date === chosen || undefined}
            data-shut={!open || undefined}
            aria-label={`${formatLongDate(date)}, ${
              date > today ? 'not yet' : !open ? 'before this habit' : kind ? WORD[kind] : 'blank'
            }`}
            aria-pressed={date === chosen}
            disabled={!open}
            title={`${formatShortDate(date)}${kind ? ` · ${WORD[kind]}` : ''}`}
            onClick={() => onChoose(date)}
          >
            <Glyph kind={kind} habit={habit} />
          </button>
        );
      })}
    </>
  );
}

/** Done carries a check, the tiny version a dot, rest a bar: shape as well as colour. */
function Glyph({ kind, habit }: { kind: CheckInKind | undefined; habit: Habit }) {
  if (kind === 'done') return <Icon name="check" size={15} strokeWidth={2.3} />;
  if (kind === 'tiny') return <span className={styles.glyphTiny} aria-hidden="true" />;
  if (kind === 'rest') return <span className={styles.glyphRest} aria-hidden="true" />;
  return <span className="visually-hidden">{habit.title}</span>;
}

/** One month of the history, in the same small dots a habit's row already uses. */
function MonthRow({
  month,
  today,
  start,
  kindOn,
  hideNumbers,
}: {
  month: string;
  today: string;
  start: string;
  kindOn: (date: string) => CheckInKind | undefined;
  hideNumbers: boolean;
}) {
  const dates = monthDates(month);
  const tended = dates.filter((d) => {
    const kind = kindOn(d);
    return kind === 'done' || kind === 'tiny';
  }).length;
  const rest = dates.filter((d) => kindOn(d) === 'rest').length;

  return (
    <div className={styles.monthRow}>
      <span className={styles.meta}>{monthName(month, 'short')}</span>
      <span className={styles.marks} aria-hidden="true">
        {dates.map((date) => (
          <span
            key={date}
            className={styles.mark}
            data-kind={kindOn(date)}
            data-shut={date > today || date < start || undefined}
            title={formatShortDate(date)}
          />
        ))}
      </span>
      {!hideNumbers && (
        <span className={styles.meta}>
          {tended} {tended === 1 ? 'time' : 'times'}
          {rest ? ` · ${rest} rest` : ''}
        </span>
      )}
    </div>
  );
}

function Key() {
  return (
    <div className={styles.key}>
      <span className={styles.keyItem}>
        <span className={styles.day} data-kind="done" aria-hidden="true">
          <Icon name="check" size={13} strokeWidth={2.3} />
        </span>
        done
      </span>
      <span className={styles.keyItem}>
        <span className={styles.day} data-kind="tiny" aria-hidden="true">
          <span className={styles.glyphTiny} />
        </span>
        the tiny version
      </span>
      <span className={styles.keyItem}>
        <span className={styles.day} data-kind="rest" aria-hidden="true">
          <span className={styles.glyphRest} />
        </span>
        rest, on purpose
      </span>
      <span className={styles.keyItem}>
        <span className={styles.day} aria-hidden="true" />
        blank, and that is all it means
      </span>
    </div>
  );
}
