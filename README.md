<p align="center">
  <img src="docs/assets/gaia-logo.webp" alt="Gaia logo" width="84" />
</p>

<h1 align="center">Gaia</h1>

<p align="center">
  <em>a kind way to organise yourself</em><br />
  <sub>tasks · time-blocking · goals · gentle habits</sub>
</p>

<p align="center">
  <img src="docs/assets/lilies-wide.webp" alt="Claude Monet, Water Lilies" width="100%" />
</p>

<p align="center">
  <a href="#why-gaia-exists">Why</a> ·
  <a href="#a-little-tour">Tour</a> ·
  <a href="#run-it">Run it</a> ·
  <a href="docs/index.html">Docs page</a> ·
  <a href="#for-developers">For developers</a>
</p>

---

## <img src="docs/assets/icons/heart.svg" width="22" height="22" alt="" /> Why Gaia exists

Most planners are built like scoreboards. Red numbers for what you didn't do,
streaks that break, lists that grow every day you look at them. They measure
you, and on a hard week they tell you that you failed.

**Gaia is an attempt at the opposite:** a planner that turns *toxic
productivity* into something softer. It helps you choose a day, not survive
one. It remembers what you did, and never counts what you didn't.

> *A quiet day is still a full day.*

Gaia is named after the Greek goddess of the Earth, the one who holds
everything without hurrying any of it. The app is painted in the colours of
Claude Monet's gardens for the same reason: organising your life should feel
more like tending a garden than clearing an inbox.

### What that means in practice

| Toxic productivity says… | Gaia says… |
|---|---|
| Your unfinished tasks follow you forever. | <img src="docs/assets/icons/plan.svg" width="16" height="16" alt="" /> **A day is chosen, not inherited.** Only what you pick for today shows up today. |
| You broke your 12-day streak. | <img src="docs/assets/icons/rhythm.svg" width="16" height="16" alt="" /> **There are no streaks.** Habits have a rhythm ("about 3 times a week"), and a blank day is just blank. |
| Mark it *done* or it counts as *failed*. | <img src="docs/assets/icons/check.svg" width="16" height="16" alt="" /> **You can log *done*, *tiny*, or *rest*.** The small version on a hard day still counts. |
| Delete it or let it rot on the list. | <img src="docs/assets/icons/move.svg" width="16" height="16" alt="" /> **Letting go is a real option.** Tasks can be let go and goals released, with their history kept. |
| Every empty hour is wasted time. | <img src="docs/assets/icons/clock.svg" width="16" height="16" alt="" /> **Rest is not empty time.** Gaia calls it *open time*, and quietly mentions a very full day once. |
| Here are your numbers. | <img src="docs/assets/icons/manage.svg" width="16" height="16" alt="" /> **Numbers are optional.** One setting hides every count without touching what you logged. |

Gaia never uses the words *missed*, *overdue*, *failed* or *streak*. That is a
rule in the code, not just a style choice.

---

## <img src="docs/assets/icons/sparkle.svg" width="22" height="22" alt="" /> A little tour

### <img src="docs/assets/icons/plan.svg" width="20" height="20" alt="" /> Plan: your day, chosen gently

Today's rhythms, the few things you picked for today, and a folded *Later* list
for everything else. The timeline beside it is where you give tasks a place.

<p align="center"><img src="docs/screenshots/plan.png" alt="The Plan page: rhythms, today's tasks and a day timeline" /></p>

### <img src="docs/assets/icons/goal.svg" width="20" height="20" alt="" /> Goals & habits: what matters to you

A goal is a direction, not a deadline. Each habit has a cue, a flexible rhythm,
and a tiny version for the days when that is all there is.

<p align="center"><img src="docs/screenshots/goals.png" alt="The Goals and habits page with two goals and four habits" /></p>

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/habit-editor.png" alt="Habit editor with a tiny version and a flexible rhythm" /></td>
    <td width="50%"><img src="docs/screenshots/task-editor.png" alt="Task editor with two scheduled sessions" /></td>
  </tr>
  <tr>
    <td align="center"><sub><em>“What's the smallest version that still counts?”</em></sub></td>
    <td align="center"><sub>A task can be worked on across several sessions</sub></td>
  </tr>
</table>

### <img src="docs/assets/icons/calendar.svg" width="20" height="20" alt="" /> Calendar and Manage

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/calendar.png" alt="Calendar month view" /></td>
    <td width="50%"><img src="docs/screenshots/manage.png" alt="Manage tasks table" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Day, week and month views of the same time blocks</sub></td>
    <td align="center"><sub>The workshop: tasks, categories and groups</sub></td>
  </tr>
</table>

### <img src="docs/assets/icons/palette.svg" width="20" height="20" alt="" /> Make it yours

Light, dark, or whatever your computer prefers, in four palettes taken from
Monet: **Water Lilies**, **Rouen Cathedral**, **Garden at Giverny** and
**Waterloo Bridge**.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/settings.png" alt="Settings page with the four Monet palettes" /></td>
    <td width="50%"><img src="docs/screenshots/plan-dark.png" alt="The Plan page in dark mode" /></td>
  </tr>
  <tr>
    <td align="center"><sub><em>“Tracking is a tool, not a test.”</em></sub></td>
    <td align="center"><sub>The same calm, after dark</sub></td>
  </tr>
</table>

### <img src="docs/assets/icons/heart.svg" width="20" height="20" alt="" /> Support

<p align="center"><img src="docs/screenshots/support.png" alt="Support page with crisis and mental-health resources" width="80%" /></p>

Gaia is a planning tool, not a health service. If things feel heavy, the
Support page lists crisis and mental-health resources in Colombia and
internationally.

---

## <img src="docs/assets/icons/plan.svg" width="22" height="22" alt="" /> Run it

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

### <img src="docs/assets/icons/user.svg" width="20" height="20" alt="" /> Your data stays with you

Gaia runs entirely in your browser. There is no account, nothing is uploaded,
and your planner is saved in `localStorage` (key `gaia:v1`) on the device you
use it on. Clearing your browser data erases it. **Settings ▸ Your data** can
export everything as JSON, restore the sample data, or delete the lot (with one
undo).

---

## <img src="docs/assets/icons/settings.svg" width="22" height="22" alt="" /> For developers

A friendlier, illustrated version of this section lives in
[`docs/index.html`](docs/index.html). Open it in any browser.

### How things relate

```
Group  →  Category  →  Task          the hierarchy: where something belongs
                        ↑
Goal  →  Habits + Tasks              an optional lens: what something is for
```

A goal is never a folder. Tasks and habits belong to a category, and may
*additionally* point at one goal. Most things never will, and that is fine.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server on port 5173 |
| `npm test` | Runs the unit tests |
| `npm run build` | Type-checks and builds a production version into `dist/` |
| `npm run art` | Regenerates the Monet crops and the logo/icon files |
| `node scripts/build-docs-assets.mjs` | Rebuilds the painting strips and icons used by the README and docs page |
| `node scripts/gen-tokens.mjs` | Regenerates `src/styles/tokens.css` from the palette definitions |

### How the code is laid out

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
docs/
  index.html          the illustrated docs page
  screenshots/        the images in this README
  assets/             painting strips and icons (node scripts/build-docs-assets.mjs)
```

### Conventions that keep Gaia kind

- **Copy rules.** Never "missed", "overdue", "failed" or "streak".
  `src/lib/copy.ts` holds the shared wording.
- **Check-ins only ever store something positive or neutral.** If you add a
  feature here, keep it that way.
- **Colour only comes from tokens.** No component names a colour, which is what
  makes a new palette a short block in `tokens.css` instead of a rewrite.
  Regenerate it with `node scripts/gen-tokens.mjs` after editing the palettes.
- **Editors are side sheets addressed by the URL** (`?task=`, `?goal=`,
  `?habit=`), so the Back button closes them. Only one can be open at a time.
- **No form submits.** Every control in an editor writes as it changes.
- **Undo works by snapshotting the whole state** before a destructive action and
  passing it to `notify(message, previous)`.
- **Old saves still load.** `migrateState` fills in anything that did not exist
  when they were written, and existing data always wins.

### The paintings

Originals live in `monet/` and are never bundled. `npm run art` cuts small
`.webp` crops into `src/assets/monet/`, which is what the app imports. To add a
painting, drop it in `monet/`, add a crop to the list in
`scripts/crop-monet.mjs`, run `npm run art`, and register it in
`src/components/art/MonetAccent.tsx`.

---

<p align="center">
  <img src="docs/assets/garden-wide.webp" alt="Claude Monet, garden" width="100%" /><br />
  <sub>All paintings by Claude Monet, public domain.</sub><br />
  <em>leave space · let the day unfold · make room for what matters</em>
</p>
