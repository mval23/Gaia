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
  captureKept: 'is a task in your Inbox',
  // Today's light, and the shape of a day.
  lightInvite: 'Good morning. How’s the light today?',
  lightEmpty: 'Three taps, whenever. A day nobody describes stays unlogged.',
  lightFoot: 'No score, no streak.',
  welcomeBackTitle: 'Welcome back',
  welcomeBack: 'Your rhythms are here whenever you want them. Nothing was lost while you were away.',
  // Looking back.
  lookBackInvite: 'Your week, when you have five minutes.',
  lookBackEmpty: 'Nothing logged for this week yet. It fills in as the week goes.',
  journalPrompt: 'Anything else, in your own words. Only you read this.',
  momentumQuestion: 'How is it moving?',
  snagQuestion: 'Snagged on what?',
  // The compass: where you're heading, in your own words.
  compassInvite:
    'A few words about where you’re heading, so a goal can point at something. One sentence and two or three words is plenty.',
  compassFolded: 'Compass is here whenever you want it.',
  compassHeading: 'Where you’re heading, in a sentence',
  compassHeadingNote: 'Provisional on purpose. Change it whenever it stops being true.',
  compassValues: 'What you want to keep hold of',
  compassRoles: 'Who you are to people, right now',
  compassRolesNote: 'Roles change. Yours are dated, not carved.',
  valuePlaceholder: 'A word, and what it means to you',
  valueSuggest: 'Stuck? Some words people use:',
  lensNote:
    'A value is a lens, never a folder: nothing lives inside it, and letting one go leaves everything where it is.',
  lensEmpty: 'Nothing points at it yet. A goal or a habit can, from its editor.',
  // Patterns: what Gaia can see in your own rows, and asks about.
  patternTitle: 'Something you might notice',
  patternNote: 'One at a time, from your own entries. Counts only: nothing you wrote is ever read.',
  patternKept: 'Confirmed from a pattern in Look back.',
  patternYes: 'Kept as your observation, in Help ▸ Why Gaia works this way.',
  patternNo: 'Put away. Gaia won’t ask this one again.',
  patternUnsure: 'Left as it is. It may come back when there is more to look at.',
  // Why Gaia works this way: three kinds of knowing, and which one wins.
  evidenceIntro:
    'Three kinds of knowing, drawn so they can’t be mistaken for one another: what someone studied, what you noticed, and what Gaia spotted in your own rows and asked about.',
  evidenceRank:
    'A study never overrules what you noticed about yourself. If the research says mornings and your own weeks say evenings, your weeks win — and both stay here, side by side.',
  evidenceUnread: 'Nobody has read the source yet.',
  evidenceStops:
    'None of this is medical or psychological advice, and Gaia is a planner, not a health service. When things feel heavy, Support lists people to talk to.',
} as const;

/**
 * What a notification says. Each one is an invitation that makes sense on its
 * own, so none of them needs to say what hasn't happened.
 */
export const NUDGE = {
  blockNow: 'Its time starts now',
  blockSoon: 'Its time starts at',
  morningTitle: 'The one that matters',
  weekTitle: 'Your week, when you have five minutes.',
  monthTitle: 'Your month, as it was',
  bothTitle: 'Your week and your month',
  lookBackBody: 'Look back is there whenever you are.',
  eveningTitle: 'Anything to note from today?',
  eveningBody: 'Tiny counts, and so does rest.',
  testTitle: 'Gaia can reach this phone',
  testBody: 'This is how a reminder will look.',
} as const;

/** The three shapes a day can take. Gentle asks less; Bright has room for more. */
export const SHAPE_WORD = {
  gentle: 'Gentle day',
  steady: 'Steady day',
  bright: 'Bright day',
} as const;

export const SHAPE_NOTE = {
  gentle: 'Tiny versions count in full, figures stay hidden, one thing is plenty.',
  steady: 'Your usual rhythm: one thing that matters, and the day around it.',
  bright: 'Room for a second block of focus, if you want one.',
} as const;

/** One word each, in the person's own reading of how a goal is going. */
export const MOMENTUM_WORD = {
  moving: 'Moving',
  steady: 'Steady',
  snagged: 'Snagged',
  resting: 'Resting',
} as const;

export const MOMENTUM_NOTE = {
  moving: 'Noted on the goal. Nothing else to do.',
  steady: 'Holding is a kind of progress.',
  snagged: 'Say what it is snagged on, and Gaia offers one small change.',
  resting: 'Resting on purpose. It stays yours, just quiet.',
} as const;

/** What a snag is, and the smallest thing that might unhook it. */
export const SNAG_WORD = {
  clarity: 'Not sure what’s next',
  time: 'No time for it',
  energy: 'Low energy',
  setup: 'The setup is off',
} as const;

export const SNAG_OFFER = {
  clarity: 'Write the next step as a task, in under ten words.',
  time: 'Give it one block of open time this week.',
  energy: 'Shrink its habit to the tiny version for a while.',
  setup: 'Change its cue or its time, rather than trying harder.',
} as const;

/** "1 task", "3 habits". */
export function countOf(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** What goes with a category when it is deleted: "5 tasks and 1 habit", or "" when nothing does. */
export function whatGoesWith(tasks: number, habits: number): string {
  const parts = [tasks && countOf(tasks, 'task'), habits && countOf(habits, 'habit')].filter(Boolean);
  return parts.join(' and ');
}

/** How full a day has to look before Gaia gently mentions it. */
export const FULL_DAY_RATIO = 0.8;
