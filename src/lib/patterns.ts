import type { GaiaState } from '../types';
import { addDays, startOfWeek } from './dates';
import { categoryById, checkInFor, dayShape, lightFor, lightLogged, restsOn } from '../store/selectors';

/**
 * Things Gaia can see in someone's own rows, and asks about rather than
 * concludes. Every rule here:
 *
 * - is always a question, never a finding and never advice;
 * - counts only what was written down: no reflection or journal text is ever
 *   read, here or anywhere;
 *   (`findPatterns` touches lights, check-ins, time blocks and rests, nothing else)
 * - is never about what didn't happen;
 * - becomes an observation of the person's own only when they say it is true.
 */
export interface Pattern {
  /** Derived from what it looks at, so the same pattern keeps the same id. */
  id: string;
  question: string;
  /** The count behind it, in plain words. */
  evidence: string;
  /** What it becomes, in the person's own words, if they say it is true. */
  observation: string;
  /** How one-sided the count is. Used only to offer the clearest one first. */
  strength: number;
}

/** The window every pattern looks at. Nothing older is counted. */
export const PATTERN_DAYS = 30;
/** Enough cases to see something at all. Below this, Gaia says nothing. */
const MIN_CASES = 6;
/** How one-sided it has to be before it is worth asking about. */
const MOSTLY = 0.7;
/** An "I'm not sure" is not a no: it may come back when there is more to look at. */
export const UNSURE_DAYS = 30;

const BEFORE_LUNCH = 12 * 60;
const EVENING = 17 * 60;

/** "3" rather than "3.0"; a number someone can read out loud. */
function roughly(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

function tended(state: GaiaState, habitId: string, date: string): boolean {
  const kind = checkInFor(state, habitId, date);
  return kind === 'done' || kind === 'tiny';
}

/** Bright mornings, and what the day before them had in it. */
function afterAHabit(state: GaiaState, days: string[]): Pattern[] {
  const bright = days.filter((d) => lightLogged(lightFor(state, d)) && dayShape(state, d) === 'bright');
  if (bright.length < MIN_CASES) return [];

  const out: Pattern[] = [];
  for (const habit of state.habits) {
    if (habit.status === 'archived') continue;
    const after = bright.filter((d) => tended(state, habit.id, addDays(d, -1)));
    const strength = after.length / bright.length;
    if (strength < MOSTLY) continue;
    out.push({
      id: `bright-after:${habit.id}`,
      question: `Your bright mornings mostly follow a day you tended ${habit.title}. Does that match how it feels?`,
      evidence: `${after.length} of the ${bright.length} mornings you called bright came after it.`,
      observation: `Bright mornings usually follow a day I tend ${habit.title}.`,
      strength,
    });
  }
  return out;
}

/** Where a category's hours land, when they nearly all land in one part of the day. */
function whenHoursLand(state: GaiaState, days: string[]): Pattern[] {
  const window = new Set(days);
  const counts = new Map<string, { early: number; late: number; total: number }>();
  for (const task of state.tasks) {
    for (const block of task.blocks) {
      if (!window.has(block.date)) continue;
      // Uncategorized hours have no name to ask about, so they are left alone.
      const category = categoryById(state, task.categoryId);
      if (!category) continue;
      const count = counts.get(category.id) ?? { early: 0, late: 0, total: 0 };
      if (block.startMin < BEFORE_LUNCH) count.early += 1;
      if (block.startMin >= EVENING) count.late += 1;
      count.total += 1;
      counts.set(category.id, count);
    }
  }

  const out: Pattern[] = [];
  for (const [id, count] of counts) {
    if (count.total < MIN_CASES) continue;
    const name = categoryById(state, id)?.name ?? '';
    const early = count.early / count.total;
    const late = count.late / count.total;
    if (early >= MOSTLY) {
      out.push({
        id: `hours-land:${id}:early`,
        question: `Your ${name} hours nearly always land before lunch. Worth keeping the mornings for it?`,
        evidence: `${count.early} of the ${count.total} ${name} blocks you placed started before 12:00.`,
        observation: `${name} goes in the morning, for me.`,
        strength: early,
      });
    } else if (late >= MOSTLY) {
      out.push({
        id: `hours-land:${id}:late`,
        question: `Your ${name} hours nearly always land in the evening. Is that when it works best?`,
        evidence: `${count.late} of the ${count.total} ${name} blocks you placed started after 17:00.`,
        observation: `${name} goes in the evening, for me.`,
        strength: late,
      });
    }
  }
  return out;
}

/** The weeks with time kept for rest in them, and what else was in those weeks. */
function restAndTending(state: GaiaState, days: string[]): Pattern[] {
  const weeks = new Map<string, { rest: boolean; tended: number }>();
  for (const date of days) {
    const key = startOfWeek(date, state.settings.weekStart);
    const week = weeks.get(key) ?? { rest: false, tended: 0 };
    if (restsOn(state, date).length > 0) week.rest = true;
    if (state.habits.some((h) => tended(state, h.id, date))) week.tended += 1;
    weeks.set(key, week);
  }

  const kept = [...weeks.values()].filter((w) => w.rest);
  const others = [...weeks.values()].filter((w) => !w.rest);
  if (kept.length < 2 || others.length < 2) return [];

  const mean = (list: { tended: number }[]) => list.reduce((n, w) => n + w.tended, 0) / list.length;
  const withRest = mean(kept);
  const without = mean(others);
  // A whole day's difference, or it isn't worth asking about.
  if (withRest - without < 1) return [];

  return [
    {
      id: 'rest-weeks',
      question: 'The weeks you kept time for rest are the weeks you tended most. Does that match how it feels?',
      evidence: `An average of ${roughly(withRest)} days tended in the ${kept.length} weeks you kept rest, and ${roughly(
        without,
      )} in the other ${others.length}.`,
      observation: 'I tend more in the weeks I keep time for rest.',
      strength: Math.min(1, (withRest - without) / 3),
    },
  ];
}

/** Everything the last `PATTERN_DAYS` hold, clearest first. */
export function findPatterns(state: GaiaState, today: string): Pattern[] {
  const days = Array.from({ length: PATTERN_DAYS }, (_, i) => addDays(today, -i));
  return [...afterAHabit(state, days), ...whenHoursLand(state, days), ...restAndTending(state, days)].sort(
    (a, b) => b.strength - a.strength,
  );
}

/**
 * The one pattern Gaia asks about now: one at a time, and only when there is
 * enough written to see it. A "not really" is never asked again; an "I'm not
 * sure" can come back once there is more to look at.
 */
export function nextPattern(state: GaiaState, today: string): Pattern | undefined {
  const answers = new Map(state.patternAnswers.map((a) => [a.id, a]));
  return findPatterns(state, today).find((pattern) => {
    const answer = answers.get(pattern.id);
    if (!answer) return true;
    return answer.verdict === 'unsure' && answer.date <= addDays(today, -UNSURE_DAYS);
  });
}
