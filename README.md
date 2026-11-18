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

In the app, **your planner ▸ Walk through it together** offers the same tour on
the real page, from Plan through Goals to Manage. At the end it offers to clear
the sample away, then goes with you through your first group, category and task,
and a time for it. It never starts on its own, and leaving it halfway is a
perfectly good ending.

### <img src="docs/assets/icons/plan.svg" width="20" height="20" alt="" /> Plan: your day, chosen gently

Today's rhythms, the few things you picked for today, and a folded *Later* list
for everything else. The timeline beside it is where you give tasks a place.
A habit with a time sits there too: drag it, or its edges, to move it or stretch
it **on that day alone** — its usual time, and every other day, stay as they are.

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

### <img src="docs/assets/icons/user.svg" width="20" height="20" alt="" /> Your data

Run on your own computer, Gaia works entirely in your browser: there is no
account, nothing is uploaded, and your planner is saved in `localStorage` (key
`gaia:v1`) on the device you use it on. Clearing your browser data erases it.

Put online (see [Accounts and Vercel](#accounts-and-vercel)), everyone signs in
and gets their own planner, kept in the `planners` table in Supabase with a copy
in the browser (`gaia:v1:<user id>`) so Gaia still opens offline; edits made
offline are sent once the connection is back.

Either way, **Settings ▸ Your data** can export everything as JSON, import such
a file, restore the sample data, or delete the lot (with one undo). A group you
link to an Outlook calendar sends its scheduled tasks there, and a calendar you
subscribe to by its iCal address is only ever read.

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
    cloud.ts          saving each account's planner to Supabase
    GaiaProvider.tsx  state, toasts, undo, and the theme stamped on <html>
  auth/               Gaia accounts (AuthGate, Supabase), Microsoft and Google sign-in
  integrations/       outlook/ the Outlook calendar link; feeds/ calendars read by
                      iCal address; google/ writing time blocks to a Google calendar
  lib/                pure helpers: dates, time, layout, rhythm, copy, sensitive,
                      reminders (what a phone is sent, and when); push.ts signs a phone up;
                      ics.ts reads an iCalendar feed; calendar.ts the shared event shape
  components/         ui kit, tasks, habits, plan sections, timeline, sheets, layout
  pages/              Plan (TodayPage), Calendar, Goals, Settings, Support, Manage/*
  styles/             tokens.css (all colour) and global.css
api/                  Vercel functions: remind (every five minutes), push-test, and ics
                      (fetches a calendar feed; vite.config.ts answers it while developing)
supabase/             schema.sql (tables and privacy), reminders.sql (the five-minute job)
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
- **One day's change belongs to that day.** Moving or stretching a habit on the
  timeline writes that day only (`habitTimes`). Nothing in Gaia quietly rewrites
  the thing you set up when you meant to change today.
- **A lens is never a folder.** A goal, and now a value, is something a task or
  a habit can point at. Dropping one clears the link and nothing else: no
  cascade, and no history lost.
- **Gaia asks; it never concludes.** A pattern in someone's own rows is drawn
  dashed and phrased as a question, and becomes a statement only when they say
  it is true. It counts check-ins, lights, blocks and rests; it never reads
  what anyone wrote in a reflection or a journal.
- **Old saves still load.** `migrateState` fills in anything that did not exist
  when they were written, and existing data always wins.

### Accounts and Vercel

Sign-in and cloud saving use [Supabase](https://supabase.com) (email and
password). They switch on when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
are set; without them Gaia runs as before, with no sign-in.

1. **Supabase:** create a project. In *SQL Editor*, run `supabase/schema.sql`.
   From *Project Settings ▸ API*, copy the project URL and the `anon` public
   key. Its row-level security is what keeps each planner private, so the key
   is safe to ship in the app.
2. **Vercel:** *Add New ▸ Project*, import this GitHub repo (Vercel reads
   `vercel.json`). Under *Environment Variables* add the two values above, plus
   `VITE_MS_CLIENT_ID` / `VITE_MS_TENANT_ID` if you use Outlook, then deploy.
3. **Back in Supabase**, *Authentication ▸ URL Configuration*: set *Site URL*
   to your Vercel address (e.g. `https://gaia-xyz.vercel.app`) and add it under
   *Redirect URLs*, so confirmation and password-reset emails link back to it.
4. **Outlook, if used:** add `https://<your vercel address>/auth-redirect.html`
   as another *Single-page application* redirect URI in the Entra app.

The first time someone signs in, if that browser already holds a planner from
before accounts (`gaia:v1`), Gaia asks whether to use it for the account or
start with the sample data. To bring over a planner from another address (such
as `localhost` to Vercel): Settings ▸ Export your data there, then Settings ▸
Import from a file on the site once you have signed in.

Environment variable changes only take effect after a new deploy.
`.env.example` lists them all.

### Phone notifications

Once accounts are on, Gaia can send a few quiet notifications, each optional:
around a task's time block, *the one that matters* in the morning, Look back on
its day, and in the evening an invitation to note your habits, sent only on a
day with nothing logged yet. A time block can bring two: a heads-up some minutes
before it, and a word as it begins. Settings ▸ Notifications sets each
separately, so you can have one, both, or neither. On an iPhone they need iOS 16.4 or newer and
Gaia added to the home screen from Safari. Set it up once:

1. **Keys:** run `npx web-push generate-vapid-keys` in this folder.
2. **Supabase:** run `supabase/schema.sql` again (it only adds what's missing).
   Copy the *secret* (`service_role`) key from *Project Settings ▸ API Keys*.
3. **Vercel:** add `VITE_VAPID_PUBLIC_KEY` (the public key), `VAPID_PRIVATE_KEY`,
   `SUPABASE_SECRET_KEY` and `CRON_SECRET` (any long random string), then
   redeploy. Only the first of these reaches the app; the rest stay on the server.
4. **Supabase again:** in `supabase/reminders.sql`, put in your Vercel address
   and `CRON_SECRET`, and run it in the SQL Editor (don't commit the filled-in
   copy). It calls `/api/remind` every five minutes.
5. **On the phone:** open Gaia from the home screen, go to Settings ▸
   Notifications, tap *Turn on for this device*, then *Send a test*.

Notifications run on the phone's own clock, and signing out turns them off on
that device.

### Subscribing to a calendar

**Settings ▸ Calendars** takes the secret iCal address of a calendar kept
somewhere else, and its events appear on the Plan timeline and in Calendar,
read-only, beside your own time blocks. Give one a group and it borrows that
group's colour. It needs no account, no app registration and nobody's approval.

Where the address lives:

| Calendar | Where to find it |
|---|---|
| Google | Settings ▸ *the calendar* ▸ Integrate calendar ▸ **Secret address in iCal format** |
| Outlook / Microsoft 365 | Settings ▸ Calendar ▸ Shared calendars ▸ **Publish a calendar** ▸ the ICS link |
| Apple iCloud | Calendar ▸ share the calendar ▸ **Public Calendar** ▸ copy the link |
| Notion | Calendar ▸ ⋯ ▸ Copy link ▸ **iCal** |

That address is a password in disguise: anyone holding it can read the
calendar. Gaia keeps it with the rest of the planner, and it is in the export.

A browser cannot fetch someone else's calendar address directly, so the server
does it: `api/ics.ts` on Vercel, and the same code through a small plugin in
`vite.config.ts` while developing. It fetches public web addresses only, never
anything on a private network, so it can't be aimed at machines it shouldn't
reach; put online, only a signed-in person may ask it for anything. All-day
entries are left out, as they are for Outlook. Repeats are expanded by
`src/lib/ics.ts`, which reads the parts of the format a calendar really uses.

### Google Calendar

**Settings ▸ Google Calendar** writes this planner's time blocks into a
calendar of yours. Give a task a time here and it appears there, and is kept in
step when you move it, rename it, finish it or let it go. Gaia only ever touches
the events it made itself, tracked in `localStorage` under `gaia:google:events`.

It writes; it doesn't read. To see that calendar's own events on your timeline,
also add it under **Settings ▸ Calendars** with its secret address — the two
sit side by side on purpose, so the direction is never in doubt.

Choosing *Nowhere* takes every event Gaia put there back out again. Blocks
dated before today are left where they are: linking a calendar doesn't copy
your past into it.

To turn it on, make a client id once in the
[Google Cloud Console](https://console.cloud.google.com). It is free, needs no
administrator, and needs no review while it is only for your own account:

1. **New Project**, any name.
2. *APIs & Services ▸ Library*: enable the **Google Calendar API**.
3. *APIs & Services ▸ OAuth consent screen*: **External**, fill in the app name
   and your email, and under *Audience* add your own Google address as a **test
   user**. (Test users is what lets you use it without Google reviewing it.)
4. *APIs & Services ▸ Credentials ▸ Create credentials ▸ OAuth client ID*,
   type **Web application**. Under *Authorised JavaScript origins* add
   `http://localhost:5173`, and your Vercel address too if you use one.
5. Copy the client id into `.env.local` in this folder, then restart Gaia.
   That file is a list of settings, not commands: open it in an editor and add
   a line, rather than typing it at a terminal.

   <sub>`.env.local`</sub>
   ```ini
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   ```

Gaia asks Google for two permissions and no more: reading the list of your
calendars, so you can pick one, and adding events to it. Nothing is kept but an
hour-long token held in memory, so closing the tab ends it; *Disconnect* tells
Google the permission is no longer wanted and forgets what Gaia wrote where.

### Microsoft sign-in

Settings ▸ Microsoft account signs in with a Microsoft account (`User.Read`,
`Calendars.ReadWrite`). Which accounts are accepted is set by the app
registration and by `VITE_MS_TENANT_ID`: a directory id allows only accounts
from that one directory, and `common` (the default when it isn't set) allows
work, school and personal accounts alike. Then, in Manage ▸ Groups & categories,
the calendar button on a group links it to one of your Outlook calendars:

- that calendar's meetings appear on the Plan timeline and in Calendar, in the
  group's colour, read-only (all-day events are not shown);
- the group's time blocks from today on are created there as events, and kept
  up to date when they move, change, or are removed. Unlinking removes them.

Changes made to those events in Outlook are not copied back. What Gaia has put
in Outlook is tracked in `localStorage` under `gaia:outlook:<account>`.

To turn it on, register an app once in the
[Microsoft Entra admin center](https://entra.microsoft.com) (App registrations
▸ New registration):

1. **Supported account types:** accounts in this organizational directory only,
   if you will sign in with a work or school account. To use a personal
   Microsoft account (outlook.com, hotmail), choose *Accounts in any
   organizational directory and personal Microsoft accounts* instead.
2. **Redirect URI:** platform *Single-page application*,
   `http://localhost:5173/auth-redirect.html`.
3. Copy the *Application (client) ID* and *Directory (tenant) ID* into
   `.env.local` in this folder, then restart Gaia. That file holds settings,
   one per line, and is edited rather than run.

   <sub>`.env.local`</sub>
   ```ini
   VITE_MS_CLIENT_ID=<application id>
   VITE_MS_TENANT_ID=<directory id>
   ```

Leave `VITE_MS_TENANT_ID` out (or set it to `common`) to let personal accounts
in as well; a directory id there turns every other account away, which is the
usual reason sign-in is refused.

`.env.local` is git-ignored. If your organization blocks users from registering
apps or consenting to them, an IT admin has to do step 1 or grant consent.

**Admin approval.** Many organisations keep app permissions for administrators
to grant, even ordinary ones like these. Microsoft then shows *Need admin
approval* instead of signing you in, and nothing can be done from Gaia's side.
An administrator grants it once, in Entra ▸ App registrations ▸ Gaia ▸ API
permissions ▸ *Grant admin consent*, or by opening

```
https://login.microsoftonline.com/<directory id>/adminconsent?client_id=<application id>
```

`User.Read` and `Calendars.ReadWrite` are delegated permissions: they reach only
the signed-in person's own calendar, never anyone else's.

**When it doesn't work,** Settings ▸ Microsoft account shows Microsoft's own
reason and what to do about it, rather than a general apology: an account the
directory doesn't hold, a permission still waiting on an administrator, a client
id that isn't there, a redirect address that wasn't registered, or a blocked
pop-up. Gaia's sign-in opens in a pop-up window, so a browser that blocks those
blocks the sign-in; allow pop-ups for Gaia's address. The calendar menu in
Manage ▸ Groups & categories says when an account has no calendar Gaia may add
to.

### The paintings

Originals live in `monet/` and are never bundled. `npm run art` cuts small
`.webp` crops into `src/assets/monet/`, which is what the app imports. To add a
painting, drop it in `monet/`, add a crop to the list in
`scripts/crop-monet.mjs`, run `npm run art`, and register it in
`src/components/art/MonetAccent.tsx`.

## License

The code is released under the [Apache License 2.0 with the Commons Clause](LICENSE).
You may use, study, change and share it, forks included, but you may not sell
it: no paid product, hosted service or support offering whose value comes
mainly from Gaia. The Monet paintings are public domain and are not covered by
it.

---

<p align="center">
  <img src="docs/assets/garden-wide.webp" alt="Claude Monet, garden" width="100%" /><br />
  <sub>All paintings by Claude Monet, public domain.</sub><br />
  <em>leave space · let the day unfold · make room for what matters</em>
</p>
