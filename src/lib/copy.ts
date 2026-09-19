/**
 * Shared wording for the daily loop. Kept in one place so the tone stays
 * consistent: nothing here blames anyone for a day that did not go to plan.
 */

export const COPY = {
  fullDay: 'This is a full day. It’s okay to move something.',
  gentleDay: 'a quiet day is still a full day',
  todayEmpty: 'Nothing chosen for today yet. Pick a few things from Later, or leave space.',
  todayEmptyGentle: 'Nothing today. That is allowed.',
  laterEmpty: 'Nothing waiting. Enjoy it.',
  rhythmsEmpty: 'Habits are small things you’d like to return to. Start with something that takes two minutes.',
  rhythmsDone: 'Nothing else on today’s rhythm.',
  aimMet: 'That is your week',
  reflectionInvite: 'Your week, when you have five minutes.',
  reflectionSaved: 'Saved. See you next week, or whenever.',
  oneThatMatters: 'The one that matters',
  chooseOne: 'Which one matters most today? Choose it from its menu.',
  withSomeone: 'With someone else',
  inboxNote: 'to sort, whenever',
  captureHint: 'What’s on your mind?',
  captureKept: 'Kept in your Inbox',
} as const;

/** How full a day has to look before Gaia gently mentions it. */
export const FULL_DAY_RATIO = 0.8;
