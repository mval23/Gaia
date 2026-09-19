# Gaia plans: notes for Claude

The roadmap for Gaia's next features, written for a build session. The same plan,
illustrated for people, is [`docs/plans.html`](plans.html). Keep the two in step:
when a decision here changes, change the page too.

**Status (19 Sep 2026):** a proposal. Nothing in it is built yet. Season 1 has
mockups and its details are settled (see Season 1 below). The open
decisions at the end are Mariana's to make, so ask before assuming an answer.

## Where it came from

Before Gaia there were two plans. Both are folded into this one.

- **Compass:** a "personal life operating system" with six layers (direction,
  priorities, execution, habits, attention and leisure, reviews), fourteen screens,
  a dashboard of about 25 panels, and a local AI that makes recommendations.
  It contributes the *why* (values and direction), anchors instead of a timetable,
  minimum versions, obstacle types, and the evidence page.
- **Life Hub:** a two-minute morning check-in (mood, sleep, habits), goals with a
  momentum tag, weekly and monthly reviews with a journal, and an Ollama companion
  that only asks questions. It contributes goal momentum, backfilling, the Socratic
  companion, and phases that start only when the previous one is in real use.
  Its planned stack (FastAPI, SQLite, Tailwind) and design system (blush, sage,
  Fraunces) are **not** used. Gaia already exists.

## The filter: three questions for every feature

Every feature has to pass these. They come from the existing conventions in the
README and `src/lib/copy.ts`.

1. **Does it count what didn't happen?** Only positive or neutral entries are
   stored. No "missed" value, no denominators like "18 of 30 days".
2. **Does it follow you from yesterday?** A day is chosen, not inherited. Never
   show a pile of unfinished things, least of all in the evening. That is why
   *closing the day* was removed on 15 Sep 2026 (commit `d986d2a`).
3. **Can you ignore it and lose nothing?** Check-ins, values and the companion are
   all optional. Gaia must work fully for someone who never opens them.

Copy rule, unchanged: never write *missed*, *overdue*, *failed* or *streak*.

## Shape of the product

Three moves: **know what matters → give it a place → look back kindly.**

Sidebar after all seasons: Plan, Calendar, Goals & habits, **Look back** (the
only new item), Manage, then Settings, Support, Help. There's no Companion page,
no Capture page and no Dashboard page. The sidebar does gain a **Capture · Ctrl I**
row under Search, but it opens the small capture window, not a page.

- **Plan** gains Today's light, a Capture button and shortcut, and today's essential.
- **Goals & habits** gains the Compass section at the top, goal momentum,
  milestones and each goal's timeline.
- **Look back** holds weekly and monthly reflections, trends, patterns and
  "where the time went".
- **Help** gains "Why Gaia works this way" (the evidence page).
- **Settings** gains the companion's status and privacy controls.

## Seasons

Each season starts when the one before it is part of Mariana's week, not on a
date. Build one season at a time.

### Season 1: Seeds (small, additive)

Mockups of every screen in this season (Plan, Capture, habit editor, goal
milestone, starter habits, phone) are on the design canvas:
https://claude.ai/artifact/R6DeUMVA6TV3TfnnDhJUQb. Where the canvas and this file disagree, this file wins.

- Habit fields: `why`, `ifThen[]` (when / then), `comingBack` (replaces Compass's
  "recovery rule after a missed day").
  In the habit editor they sit after the existing fields, under a heading "Why it
  matters, and what helps" marked all optional. *Why* is private and shows under
  the habit on hard days. *Coming back* is what Gaia shows after a few quiet days,
  in place of anything about the gap.
- **Today's essential**: mark one of today's tasks as the one that matters, with up
  to two more beside it. On Plan it's a larger card labelled **The one that
  matters**, marked with a lavender star, and its block on the timeline carries
  the same star.
- **Capture**: **Ctrl I** from anywhere (next to Search's Ctrl K), a Capture
  button in Plan's header, and a Capture row in the sidebar. It opens a small
  one-line window: Enter keeps it, Esc closes, and nothing is asked (no category,
  date or goal). Captures land in an **Inbox** at the top of Later, marked "to
  sort, whenever". Each has a **Sort** menu: *Plan it for today*, *Make it a
  task…*, *Make it a habit…*, *Make it a goal…* (each opens its editor
  prefilled), and *Let it go*. Captures never age visibly: no growing count, no
  dates that nag.
- Task status `'waiting'` with an optional `waitingOn` and `waitingSince`. The
  UI never calls it "waiting", because Later already says "10 waiting". It's a
  folded **With someone else** section on Plan, and each row shows who has it
  and since when ("Laura has it · since Tue").
- Optional goal **milestone** (`target`, `current`, `unit`), only for goals that are
  truly countable. Never a percentage.
- PWA manifest and icon, so Gaia can be installed on the home screen.
- A starter set of the three habits below: a "Start with a few habits" card in
  Settings, above *Your data*. Each habit can be picked or not, and the button
  reads "Add these three", "Add these two" or "Add this habit" to match. They go
  into Personal · Health with no goal linked.
- *Ready for the next season when* all tasks live in Gaia and the essential feels
  useful.

### Season 2: Light (the day and the week)
- **Today's light**: a morning card with three optional taps: energy
  (low/some/good), sleep (rough/okay/rested), mind (calm/full/heavy). Under two
  minutes. No score. Keyed by date, so an earlier day can be filled in with nothing
  marking it as late. "Heavy" shows a quiet link to Support.
- **Day shapes**: Gentle (already exists as `gentleDayDate`), Steady, Bright.
  Today's light suggests one, and the user always picks.
- **Welcome back** after a few unlogged days. It never counts the gap and offers a
  Gentle day.
- **Goal momentum**, asked right after the weekly reflection: moving, steady,
  snagged or resting. "Snagged" asks *on what?* (clarity, time, energy, setup) and
  offers one small change for each. Each goal gets a timeline of tags and notes.
- **Look back**: weekly and monthly reflections with a `journal` field and the
  period's data pulled in. There is no daily review.
- Timeline: **rest blocks** (`TimeBlock.kind = 'rest'`), a **work ends** anchor,
  goals dragged onto the timeline (this creates a "time for …" task linked to the
  goal), and **repeating tasks** (`Task.repeat`, reusing `Rhythm`).
- *Ready for the next season when* Today's light has been used most mornings for
  two or three weeks, and one weekly and one monthly look back are done.

### Season 3: Compass (direction)
- **Compass** section: a few values in the user's own words, roles, and one
  provisional heading sentence. Goals can point at a value (`valueId`), as an
  optional lens and never a folder, the same way tasks point at goals.
- **Patterns in your data** in Look back: descriptive correlations, drawn dashed and
  phrased as a question ("Does that match how it feels?"). A pattern becomes an
  observation only when the user confirms it.
- **Why Gaia works this way** in Help, with three visually distinct kinds of
  entry: a source (verified or not yet verified), your observation, and a pattern
  in your data. Seed it from the design brief artifact.
- *Ready for the next season when* a pattern has come up and felt fair.

### Season 4: Companion (local AI)
- Lives **inside Look back and the goal editor**, not on a page of its own.
- **It asks, and doesn't conclude.** It points at the user's own data and asks a
  question, and the answer goes into the journal. It never writes the review or sums
  up the month. Mariana decided this, and it isn't negotiable.
- It proposes changes **only when asked** for help with a plan. A proposal holds one
  reducer `Action`. Only an explicit **Add it** dispatches it, through the normal
  undo snapshot. The other options are *Edit first* (opens the editor pre-filled)
  and *Not now*.
- Per-conversation scopes. Reflections are off by default, matching the rule that
  reflection text is never inspected.
- It never diagnoses, calls itself a therapist, makes medical or diet claims, or
  mentions what didn't happen. When things sound heavy it points to Support.
- Engine: Ollama first (pending decision), an in-browser model second, and
  plainly "off" when neither is available.
- Privacy: conversation deletion, encrypted export, companion status in Settings.
  In account mode, check-ins and conversations stay on the device unless syncing
  is turned on (pending decision).
- *Keep it if* it sharpens what the user notices. *Dial it back if* it starts doing
  the review for them.

Later ideas (finances, life-area views, quarterly looks) come in as **lenses** on
existing things, never as new folders or hierarchies.

## Data model additions

All additions are optional fields or new lists. Add each one to `migrateState` in
`src/store/persist.ts` so old saves load, and make every change a reducer action
in `src/store/reducer.ts`.

```ts
// Season 1
interface Habit { …; why?: string; ifThen?: { when: string; then: string }[]; comingBack?: string }
type TaskStatus = 'open' | 'done' | 'let-go' | 'waiting';
interface Task  { …; waitingOn?: string; waitingSince?: string; essential?: boolean }   // essential only counts on plannedFor
interface Capture { id: ID; text: string; createdAt: string }
interface Goal  { …; milestone?: { target: number; current: number; unit?: string } }

// Season 2
interface Light { date: string; energy?: 'low' | 'some' | 'good'; sleep?: 'rough' | 'okay' | 'rested';
                  mind?: 'calm' | 'full' | 'heavy'; nap?: boolean }
type DayShape = 'gentle' | 'steady' | 'bright';          // gentleDayDate → { date, shape }
type Momentum = 'moving' | 'steady' | 'snagged' | 'resting';
interface GoalCheckIn { goalId: ID; date: string; momentum: Momentum;
                        snag?: 'clarity' | 'time' | 'energy' | 'setup'; note?: string }
interface Reflection { …; period: 'week' | 'month'; journal?: string }   // old saves → 'week'
interface TimeBlock { …; kind?: 'task' | 'rest' }
interface Task  { …; repeat?: Rhythm }

// Season 3
interface Value { id: ID; word: string; note?: string }
interface Compass { values: Value[]; roles: string[]; heading?: string; updatedAt: string }
interface Goal  { …; valueId?: ID }
interface Evidence { id: ID; kind: 'source' | 'observation' | 'pattern'; title: string;
                     url?: string; verified?: boolean; note?: string }

// Season 4
interface Proposal { id: ID; reason: string; action: Action; status: 'open' | 'added' | 'set-aside'; createdAt: string }
```

## Words

Put new shared wording in `src/lib/copy.ts`.

| Earlier plans said | Gaia says |
|---|---|
| Current streaks | Your rhythm this week |
| Needs attention | Worth a look |
| Minimum / Standard / Strong day | Gentle / Steady / Bright |
| Recovery rule after a missed day | Coming back |
| Planned vs completed | Where the time went |
| Completion trend | What you tended |
| Energy tracking / daily check-in | Today's light |
| Automatic avoidance patterns | What pulled me away? (optional reflection question) |
| 18 of last 30 days | 18 days tended this month |
| Stuck | Snagged, on what? |
| Backfill a missed day | Fill in an earlier day |
| Dashboard | Look back |
| Intentional leisure window | Rest, on purpose |
| Waiting-for list | With someone else ("Laura has it · since Tue") |
| Essential task / daily priority | The one that matters |
| Capture inbox | Inbox, "to sort, whenever" |

## Left out on purpose

Don't build these, even if an older plan asks for them:

- Streaks, in any form.
- A dashboard with many panels on the home screen.
- Planned-vs-completed comparisons, or "X of N days" denominators.
- A daily review or end-of-day card.
- Social media minutes or "avoidance" tracking.
- An AI that summarises the user or writes the review.
- A rewrite on FastAPI or SQLite, Wi-Fi-only access, or Tailscale.

## Mariana's own setup (the starter habits)

The day window is 07:00–23:00 (existing `dayStartHour` / `dayEndHour`). She works
from home with no fixed meetings.

| Habit | Rhythm | Cue | Usual | Tiny version |
|---|---|---|---|---|
| Move my body | about 3×/week | after lunch on gym days | gym, ~80 min incl. travel | gym clothes on, 10-min walk |
| Morning start | Mon–Fri, ~07:00 | when I get up | wash, eat, choose today's tasks in Gaia | water, wash, write one thing that matters |
| Evening shutdown | Sun–Thu, ~22:15 | when the series window ends | close work, choose tomorrow's first task, screens down, asleep by 23:00 | write tomorrow's first step, phone in another room |

## Open decisions (ask Mariana)

1. Should the direction section be called "Compass" or "What matters"?
2. Gentle / Steady / Bright, or Compass's Minimum / Standard / Strong?
3. "Snagged" or "stuck"?
4. Privacy: should check-ins and conversations sync in account mode? The
   proposal says off by default.
5. Companion engine: Ollama first, or in-browser first?
