---
description: Analyse the whole Gaia repo and design + build a first-run, on-screen tutorial for new users
---

# Build Gaia's first-run tutorial

Your job is to give a **brand-new user** a short, on-screen, guided first run of
Gaia: a tutorial that points at the real controls on the real page and invites
them to make their first things. Not a docs page, not a video, not a wall of
text — highlights and small notes **on the app screen itself**, in the style of
"this is where you choose your day" → "make your first task here" → "give it a
place on the timeline".

Work in four phases and **stop for my approval at the end of Phase 3**. Do not
write feature code before then.

---

## Phase 1 — Read the whole repo first

Do not skim, and do not guess at screens. Read enough to name every surface a
new user meets and every control the tutorial could point at.

Start here, then follow whatever these reference:

- `README.md` — especially **"Conventions that keep Gaia kind"**. That section
  is the rulebook and it binds you.
- `CLAUDE.md`, `docs/plans.md` (roadmap, vocabulary, and what is deliberately
  left out), `docs/index.html`.
- `src/App.tsx` — every route: `/`, `/calendar`, `/goals`, `/manage/tasks`,
  `/manage/groups`, `/settings`, `/help`, `/support`, `/plans`.
- `src/types.ts`, `src/store/` (`reducer.ts`, `selectors.ts`, `persist.ts`,
  `GaiaProvider.tsx`) — the data model and how state is saved and migrated.
- `src/data/seed.ts` and `src/data/starterHabits.ts` — what a new planner
  actually contains on first open. The tutorial must match *that*, not the
  screenshots.
- `src/pages/` — every page, and `src/pages/HelpPage.tsx` in particular: it
  already explains Gaia in prose. The tutorial must complement it, not repeat
  it.
- `src/components/layout/` (AppShell, Sidebar, SearchPalette),
  `src/components/plan/`, `/tasks/`, `/habits/`, `/timeline/`, `/sheet/`,
  `/capture/`, and the UI kit in `src/components/ui/` (Popover, Menu, Toast,
  SegmentedControl…).
- `src/lib/copy.ts` — the shared wording and the tone to write in.
- `src/hooks/` — `useFocusTrap`, `useSheetParam`, `useDateParam`, `useMediaQuery`
  and friends. Reuse these.

Then write me a short inventory: the surfaces, the vocabulary Gaia uses for
each concept (Group → Category → Task; Goal as a lens, not a folder; rhythms;
Later; Inbox; open time; done / tiny / rest), and which UI elements are stable
enough to anchor a highlight to.

## Phase 2 — Decide what a new user actually needs

Not a feature tour. The shortest path to *their own first useful day*. Cut
anything a new user does not need on day one — accounts, Outlook, palettes,
export, Manage's deeper corners can all wait.

Think in terms of: what is Gaia's one idea (a day is chosen, not inherited),
what do they have to create to feel it, and where does each of those live.
Expect something close to:

1. Where you are — Plan is today, and today is chosen.
2. Make your first task (inline add, or Capture).
3. Give it a place — drop it on the timeline, see open time.
4. What matters to you — a goal, and a habit with a rhythm and a tiny version.
5. Where everything else lives — Later, Inbox, Calendar, Manage, Settings.

Propose your own version if the repo tells you otherwise. Keep it to **five or
six steps**. A tutorial longer than a coffee is a tutorial nobody finishes.

## Phase 3 — Design it, then stop and show me

Give me, in chat, before any code:

- the step list, with the exact anchor element for each one (file + the element
  you'd attach to) and the exact copy you'd write;
- how a step advances: when the user does the thing, or when they press
  "Next", or both;
- how it looks (reusing the existing Popover / tokens, no new visual language);
- where "replay the tutorial" lives afterwards;
- what you will *not* cover, and why.

Ask me anything you genuinely cannot decide from the repo — especially whether
the steps should wait for the user to really create a task and a habit, or just
point and explain.

## Phase 4 — Build it, after I say go

### Rules you must not break

- **New users only.** Someone who has been using Gaia for months must never see
  this. Adding a "seen the tutorial" flag that defaults to *false* would show it
  to every existing planner on their next load — `migrateState` merges defaults
  into old saves. Solve that deliberately and tell me how.
- **Never blocking, never nagging.** Skippable at every step, dismissible with
  Escape, and once it is dismissed it stays dismissed. No "you didn't finish
  your setup", no progress guilt, no badge waiting for them.
- **Gaia's voice.** Never "missed", "overdue", "failed", "streak". Never scold,
  never hurry. Leaving the tutorial early is a perfectly good outcome and the
  copy should sound like it. Put any shared wording in `src/lib/copy.ts`.
- **Colour only from `src/styles/tokens.css`.** No component names a colour.
  Works in light and dark, in all four palettes.
- **No new dependencies.** No tour library. Build it from the existing UI kit.
- **Accessible.** Keyboard-reachable, focus managed (see `useFocusTrap`),
  proper labels, and it must respect `prefers-reduced-motion`.
- **Mobile too.** The sidebar becomes a drawer and Plan has a panel toggle
  below the mobile breakpoint — either handle it or tell me plainly what the
  tutorial does on a phone.
- **Follow the house patterns:** state changes go through one action in
  `reducer.ts`, editors stay URL-addressed sheets, no form submits, destructive
  things snapshot state for undo.

### Done means

- `npm test` passes, with tests for the new logic (when it shows, when it never
  shows again, the migration path for existing saves).
- `npm run build` type-checks clean.
- You ran the app (`npm run dev`, port 5173), walked the tutorial as a genuinely
  new planner would see it, and showed me screenshots — light and dark, desktop
  and mobile width.
- Docs updated where the change is user-visible: a line in the README tour, a
  pointer from `src/pages/HelpPage.tsx`, and `docs/plans.md` +
  `docs/plans.html` together if this belongs on the roadmap.

Work on a branch. Do not commit or push unless I ask.
