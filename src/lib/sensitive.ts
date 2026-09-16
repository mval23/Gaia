/**
 * A deliberately narrow check for goals about food, weight or the body.
 *
 * It exists to offer a kind, non-directive note next to the goal — never to
 * block anything, judge anyone, or guess at how someone is doing. It looks at
 * goal titles only: what people write in a reflection is never inspected.
 *
 * Kept small on purpose. A broad list would misfire on ordinary goals like
 * "cook more often", and a false alarm here costs trust.
 */
const TERMS = [
  // English
  'weight',
  'calorie',
  'calories',
  'diet',
  'dieting',
  'fasting',
  'lose weight',
  'slim',
  'thinner',
  'bmi',
  // Spanish
  'peso',
  'adelgazar',
  'calorías',
  'calorias',
  'dieta',
  'ayuno',
  'kilos',
  'flaco',
  'flaca',
];

export function mentionsBodyOrFood(title: string): boolean {
  const t = title.toLowerCase();
  return TERMS.some((term) => t.includes(term));
}

export const BODY_NOTE =
  'Goals about food, weight or your body can sometimes become stressful. Gaia does not track any of that. If this area feels difficult, a doctor or a dietitian can help.';

/** How many new habits in a week before Gaia gently mentions it. */
export const MANY_NEW_HABITS = 3;

export const MANY_NEW_HABITS_NOTE =
  'You have started a few habits this week. Most people find one or two easier to keep hold of — there is no rush to add more.';
