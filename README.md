# Gaia

A calm daily planner. Tasks and time-blocking, with goals and habits layered on
top in a way that is meant to support you rather than keep score.

Gaia runs entirely in your browser. There is no account, nothing is uploaded,
and your planner is saved on the device you use it on.

![Monet, Water Lilies](src/assets/monet/lilies-strip.webp)

## Run it

**Easiest:** double-click **Gaia** on your desktop (or `Start Gaia.bat` in this
folder). It installs what it needs the first time, starts the app, and opens it
in your browser. Keep the small terminal window open while you use Gaia; close
it to stop.

**From a terminal:**

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Requires [Node.js](https://nodejs.org) 18 or newer.

## What is in it

**Plan** is the day. On the left: today's rhythms, the tasks you chose for
today, and a collapsed *Later* list holding everything else. On the right: a
24-hour timeline you can drag tasks onto.

**Calendar** shows day, week and month views of the same time blocks.

**Goals** is what matters to you, with the habits and steps attached to each
one. Goals can be paused, finished, or let go — all four keep their history.

**Manage** is the workshop: tasks, habits, categories and groups, with filters
and inline editing. The habits tab is where each habit's pattern of recent days
lives.

**Settings** covers the theme (light, dark, or follow the system), four palettes
drawn from the paintings in `monet/`, the shape of your day, whether counts are
shown at all, and exporting or deleting your data.

**Support** lists crisis and mental-health resources. Gaia is a planning tool,
not a health service.

## How things relate

```
Group  →  Category  →  Task          the hierarchy: where something belongs
                        ↑
Goal  →  Habits + Tasks              an optional lens: what something is for
```

A goal is never a folder. Tasks and habits belong to a category, and may
*additionally* point at one goal. Most things never will, and that is fine.

## The ideas it is built on

- **A day is chosen, not inherited.** A task appears under Today only when you
  pick it for that day or put it on the timeline. Nothing follows you around
  forever.
- **No streaks.** Habits have a flexible rhythm ("about three times a week"), a
  cue, and a tiny version for hard days. You can log *done*, *tiny*, or *rest*.
  A day with nothing logged stays blank — there is no value in the data that
  means "missed".
- **Letting go is a real option.** Tasks can be let go and goals released, both
  keeping their history, instead of being deleted or left to rot.
- **Rest is not empty time.** The day summary says "open time", and mentions a
  very full day once, quietly.
- **Numbers are optional.** One setting hides every count without touching what
  you have logged.

The reasoning behind all of this, including the research it draws on, is in the
design brief that accompanied the work.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server on port 5173 |
| `npm test` | Runs the unit tests |
| `npm run build` | Type-checks and builds a production version into `dist/` |
| `npm run art` | Regenerates the Monet crops and the logo/icon files |
| `node scripts/gen-tokens.mjs` | Regenerates `src/styles/tokens.css` from the palette definitions |

## How the code is laid out

```
src/
  types.ts            every entity: Group, Category, Task, Goal, Habit, CheckIn, Reflection
  store/
    reducer.ts        one switch, one action per change, no side effects
    selectors.ts      plain read functions (partitionDay, habitsForDate, weekCount…)
    persist.ts        localStorage, plus migrateState for saves from older versions
    GaiaProvider.tsx  state, toasts, undo, and the theme stamped on <html>
  lib/                pure helpers: dates, time, layout, rhythm, copy, sensitive
  components/         ui kit, tasks, habits, plan sections, timeline, sheets, layout
  pages/              Plan (TodayPage), Calendar, Goals, Settings, Support, Manage/*
  styles/             tokens.css (all colour) and global.css
```

A few conventions worth knowing before you change things:

- **Colour only comes from tokens.** No component names a colour. That is what
  makes a new palette a short block in `tokens.css` instead of a rewrite.
  Regenerate it with `node scripts/gen-tokens.mjs` after editing the palettes.
- **Editors are side sheets addressed by the URL** (`?task=`, `?goal=`,
  `?habit=`), so the Back button closes them. Only one can be open at a time.
- **No form submits.** Every control in an editor writes as it changes.
- **Undo works by snapshotting the whole state** before a destructive action and
  passing it to `notify(message, previous)`.
- **Check-ins only ever store something positive or neutral.** If you add a
  feature here, keep it that way.
- **Copy rules:** never "missed", "overdue", "failed" or "streak". `src/lib/copy.ts`
  holds the shared wording.

## Your data

It lives in `localStorage` under the key `gaia:v1`, on this device only.
Clearing your browser data erases it. Settings ▸ Your data can export
everything as JSON, restore the sample data, or delete the lot (with one undo).

Saves written by older versions still load: `migrateState` fills in anything
that did not exist when they were written, and existing data always wins.

## The paintings

Originals live in `monet/` and are never bundled. `npm run art` cuts small
`.webp` crops into `src/assets/monet/`, which is what the app imports. To add a
painting, drop it in `monet/`, add a crop to the list in
`scripts/crop-monet.mjs`, run `npm run art`, and register it in
`src/components/art/MonetAccent.tsx`.

All works by Claude Monet, public domain.
