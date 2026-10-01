import type { Evidence } from '../types';

/** A source, as Gaia's design brief cited it, and what it shaped here. */
interface Source {
  id: string;
  title: string;
  note: string;
  shapes: string;
}

/**
 * What the design brief rests on: the rows "Why Gaia works this way" starts
 * with. None of them is marked as read, because that is the truth — the brief
 * cited them and nobody here has opened the paper yet. Reading one and ticking
 * it off is exactly what that mark is for.
 */
const SOURCES: Source[] = [
  {
    id: 'ev-if-then',
    title: 'Deciding “when X happens, I’ll do Y” in advance makes people much more likely to follow through.',
    note: 'Gollwitzer & Sheeran, 2006, on implementation intentions.',
    shapes: 'If–then plans, and the cue on every habit.',
  },
  {
    id: 'ev-habit-forming',
    title:
      'Habits form by repetition in a steady context. It took people a median of 66 days, and missing a single day did not set them back.',
    note: 'Lally, van Jaarsveld, Potts & Wardle, 2010; Wood & Neal, 2007.',
    shapes: 'A habit’s rhythm and its time of day, and saying honestly that this takes a while.',
  },
  {
    id: 'ev-streaks',
    title: 'Coming back regularly matters more than never stopping, and a broken streak can make people give up altogether.',
    note: 'Silverman & Barasch, 2023, on how broken streaks affect later choices.',
    shapes: 'No streaks anywhere. Flexible rhythms, totals that never reset, and rest you can log.',
  },
  {
    id: 'ev-self-compassion',
    title: 'Kindness after a setback leads to more motivation to improve, not less.',
    note: 'Neff, 2003; Breines & Chen, 2012.',
    shapes: 'Copy that never mentions what didn’t happen, and gentle days.',
  },
  {
    id: 'ev-coming-back',
    title: 'Reading one slip as total failure is what turns a lapse into giving up; a fresh start renews motivation.',
    note: 'Marlatt & Gordon, 1985; Dai, Milkman & Riis, 2014, on the fresh start effect.',
    shapes: 'Coming back, and the welcome back after time away. No broken states.',
  },
  {
    id: 'ev-letting-go',
    title: 'Letting go of a goal that no longer fits supports wellbeing.',
    note: 'Wrosch, Scheier, Miller, Schulz & Carver, 2003.',
    shapes: 'Let go and Resting are real choices, and both keep their history.',
  },
  {
    id: 'ev-planning',
    title: 'Concrete plans quiet the noise of unfinished goals.',
    note: 'Masicampo & Baumeister, 2011.',
    shapes: 'A day that is chosen rather than inherited, and hours placed on a timeline.',
  },
  {
    id: 'ev-why',
    title: 'Doing something for its own value lasts longer than doing it for a reward or under pressure.',
    note: 'Deci, Koestner & Ryan, 1999; Sheldon & Elliot, 1999, on self-concordance.',
    shapes: '“Why does this matter to you?”, shown back to you later. No points and no badges.',
  },
  {
    id: 'ev-monitoring',
    title: 'Tracking progress does help, and the shape of the feedback decides whether it helps.',
    note: 'Harkin et al., 2016.',
    shapes: 'Descriptive counts only, and one setting that hides every number.',
  },
];

/**
 * The shelf as it arrives, seeded once into a save that has no evidence list
 * yet. Afterwards they are ordinary rows: editable, and able to be let go.
 */
export function seedEvidence(at = new Date().toISOString()): Evidence[] {
  return SOURCES.map((s) => ({
    id: s.id,
    kind: 'source' as const,
    title: s.title,
    note: s.note,
    shapes: s.shapes,
    verified: false,
    createdAt: at,
  }));
}
