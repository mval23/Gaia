import { useState, type MouseEvent } from 'react';
import type { Palette, Theme } from '../types';
import { useGaia } from '../store/GaiaProvider';
import { Icon, type IconName } from '../components/ui/Icon';
import logoMark from '../assets/brand/gaia-logo.webp';
import styles from './HelpPage.module.css';

// The same images as docs/index.html, so the guide and the in-app page never drift apart.
const DOCS = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>(['../../docs/assets/*-wide.webp', '../../docs/screenshots/*.png'], {
      eager: true,
      import: 'default',
    }),
  ).map(([path, src]) => [path.slice(path.lastIndexOf('/') + 1), src]),
);

const LINKS = [
  { id: 'why', label: 'Why' },
  { id: 'tour', label: 'Tour' },
  { id: 'habits', label: 'Habits' },
  { id: 'palettes', label: 'Palettes' },
  { id: 'start', label: 'Start' },
];

const SWAPS: { old: string; icon: IconName; title: string; text: React.ReactNode }[] = [
  {
    old: 'Unfinished tasks follow you forever',
    icon: 'plan',
    title: 'A day is chosen, not inherited',
    text: 'A task shows up under Today only when you pick it for that day or place it on the timeline.',
  },
  {
    old: 'You broke your 12-day streak',
    icon: 'rhythm',
    title: 'There are no streaks',
    text: 'Habits have a flexible rhythm, like “about three times a week”. A blank day is just blank.',
  },
  {
    old: 'Done, or it counts as failed',
    icon: 'check',
    title: 'Done, tiny, or rest',
    text: 'The small version you manage on a hard day still counts.',
  },
  {
    old: 'Delete it, or let it rot on the list',
    icon: 'move',
    title: 'Letting go is a real option',
    text: 'You can let tasks go and release goals, and their history stays.',
  },
  {
    old: 'Every empty hour is wasted time',
    icon: 'clock',
    title: 'Rest is not empty time',
    text: (
      <>
        Gaia calls it <em>open time</em>. If a day gets very full, it says so once, quietly.
      </>
    ),
  },
  {
    old: 'Here are all your numbers',
    icon: 'manage',
    title: 'Numbers are optional',
    text: 'One setting hides every count and leaves what you logged untouched.',
  },
];

type ShotKey = 'plan' | 'goals' | 'calendar' | 'manage' | 'settings' | 'support';

const SHOTS: { key: ShotKey; icon: IconName; tab: string; title: string; text: string; alt: string }[] = [
  {
    key: 'plan',
    icon: 'plan',
    tab: 'Plan',
    title: 'Plan',
    text: 'Your day, chosen gently. Today’s rhythms, the few things you picked, and a folded Later list for everything else. The timeline shows where they fit, and how much open time is left.',
    alt: 'The Plan page: rhythms, today’s tasks and a day timeline',
  },
  {
    key: 'goals',
    icon: 'goal',
    tab: 'Goals & habits',
    title: 'Goals & habits',
    text: 'What matters to you. A goal is a direction, not a deadline. It can be paused, finished, or let go, and keeps its history either way.',
    alt: 'The Goals and habits page with two goals and four habits',
  },
  {
    key: 'calendar',
    icon: 'calendar',
    tab: 'Calendar',
    title: 'Calendar',
    text: 'Day, week and month views of the same time blocks, with a small reminder that there is time.',
    alt: 'Calendar month view',
  },
  {
    key: 'manage',
    icon: 'manage',
    tab: 'Manage',
    title: 'Manage',
    text: 'The workshop: tasks, categories and groups, with filters and inline editing.',
    alt: 'Manage tasks table',
  },
  {
    key: 'settings',
    icon: 'settings',
    tab: 'Settings',
    title: 'Settings',
    text: 'Theme, palette, the shape of your day, whether counts are shown at all, and your data. “Tracking is a tool, not a test.”',
    alt: 'Settings page with theme, palettes and data options',
  },
  {
    key: 'support',
    icon: 'heart',
    tab: 'Support',
    title: 'Support',
    text: 'Crisis and mental-health resources, always one click away.',
    alt: 'Support page with crisis and mental-health resources',
  },
];

const PALETTES: { value: Palette; strip: string; name: string; note: string; swatches: string[] }[] = [
  { value: 'lilies', strip: 'lilies', name: 'Water Lilies', note: 'Warm ivory, lavender and sage', swatches: ['#f5f2ed', '#ab9dce', '#9fd0ba', '#5b6679'] },
  { value: 'rouen', strip: 'rouen', name: 'Rouen Cathedral', note: 'Sunlit stone and gold', swatches: ['#f7f2e9', '#d3b58a', '#c9a98a', '#6b5f4e'] },
  { value: 'giverny', strip: 'garden', name: 'Garden at Giverny', note: 'Green shade and pale paths', swatches: ['#f1f4ee', '#9fc39b', '#bdd3b0', '#4f6350'] },
  { value: 'waterloo', strip: 'bridge', name: 'Waterloo Bridge', note: 'Dusk mauve and smoke', swatches: ['#f3f1f4', '#c8a9c4', '#b3a7d6', '#5c5570'] },
];

/** A made-up fortnight for the rhythm example: d = done, t = tiny, r = rest, space = blank. */
const RHYTHM = '  d t d r dd t';

/**
 * The Gaia guide (docs/index.html), inside the app. The theme and palette
 * buttons change the real settings, so choosing one repaints Gaia itself.
 */
export function HelpPage() {
  const { state, dispatch } = useGaia();
  const { theme, palette } = state.settings;
  const [shot, setShot] = useState<ShotKey>('plan');
  const current = SHOTS.find((s) => s.key === shot)!;
  const art = PALETTES.find((p) => p.value === palette) ?? PALETTES[0];

  const setTheme = (t: Theme) => dispatch({ type: 'settings/update', patch: { theme: t } });
  const setPalette = (p: Palette) => dispatch({ type: 'settings/update', patch: { palette: p } });

  // In-page links: scroll the section into view without touching the router's URL.
  const jump = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <a className={styles.brand} href="#top" onClick={(e) => jump(e, 'top')}>
            <img src={logoMark} width={30} height={30} alt="" />
            Gaia
          </a>
          <nav className={styles.links} aria-label="Sections">
            {LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} onClick={(e) => jump(e, l.id)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={styles.seg} role="group" aria-label="Theme">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.wrap} id="help-top">
        <div className={styles.hero}>
          <div className={styles.eyebrow}>A calm daily planner</div>
          <h1>Gaia</h1>
          <p className={styles.lede}>
            A kind way to organise yourself. Tasks, time-blocking, goals and habits, built to support you instead of
            keeping score.
          </p>
          <div className={styles.script}>a quiet day is still a full day</div>
          <Petals />
          <div className={styles.strip}>
            <img src={DOCS[`${art.strip}-wide.webp`]} alt={`Claude Monet, ${art.name}`} width={2400} height={480} />
          </div>
        </div>

        {/* Why */}
        <section id="help-why" className={styles.section}>
          <div className={styles.eyebrow}>Why Gaia exists</div>
          <h2>Organising yourself shouldn’t hurt</h2>
          <p className={styles.intro}>
            Most planners are built like scoreboards. Gaia is an attempt to turn toxic productivity into something
            softer.
          </p>

          <div className={`${styles.card} ${styles.letter}`}>
            <p>
              Red numbers for what you didn’t do. Streaks that break. Lists that grow every time you look at them. A lot
              of productivity tools measure you, and on a hard week they tell you that you failed.
            </p>
            <p>
              Gaia is meant to feel different. It helps you <em>choose</em> a day instead of survive one. It remembers
              what you did and never counts what you didn’t. Rest counts as part of the plan, and letting something go
              is allowed.
            </p>
            <blockquote>Tending a garden, not clearing an inbox.</blockquote>
            <p>
              That is why it is named after Gaia, the Greek goddess of the Earth, and why it is painted in the colours of
              Monet’s gardens.
            </p>
            <p className={styles.sign}>
              made with care <Icon name="heart" size={18} />
            </p>
          </div>

          <div className={styles.swap} aria-label="How Gaia reframes productivity">
            {SWAPS.map((s) => (
              <div key={s.title} className={styles.swapRow}>
                <div className={styles.old}>{s.old}</div>
                <div className={styles.arrow} aria-hidden="true">
                  →
                </div>
                <div className={`${styles.card} ${styles.new}`}>
                  <Icon name={s.icon} size={20} className={styles.newIcon} />
                  <div>
                    <b>{s.title}</b>
                    <span className={styles.d}>{s.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tour */}
        <section id="help-tour" className={styles.section}>
          <div className={styles.eyebrow}>A little tour</div>
          <h2>What’s inside</h2>
          <p className={styles.intro}>Six places, one calm rhythm. Choose a tab to look around.</p>

          <div className={styles.tabs} role="tablist" aria-label="Screens">
            {SHOTS.map((s) => (
              <button key={s.key} type="button" role="tab" aria-selected={shot === s.key} onClick={() => setShot(s.key)}>
                <Icon name={s.icon} size={17} />
                {s.tab}
              </button>
            ))}
          </div>

          <figure className={`${styles.card} ${styles.shot}`} role="tabpanel">
            <img src={DOCS[`${current.key}.png`]} alt={current.alt} width={1440} height={900} />
            <figcaption>
              <h3>{current.title}</h3>
              <p>{current.text}</p>
            </figcaption>
          </figure>

          <div className={styles.gallery}>
            <figure>
              <img
                src={DOCS['habit-editor.png']}
                width={1440}
                height={900}
                alt="Habit editor with a tiny version and a flexible rhythm"
                loading="lazy"
              />
              <figcaption>
                <em>“What’s the smallest version that still counts?”</em> Every habit has a cue, a rhythm, and a tiny
                version.
              </figcaption>
            </figure>
            <figure>
              <img src={DOCS['task-editor.png']} width={1440} height={900} alt="Task editor with two scheduled sessions" loading="lazy" />
              <figcaption>
                Editors open as side sheets and save as you type. A task can be worked on across several sessions.
              </figcaption>
            </figure>
            <figure>
              <img src={DOCS['goals-dark.png']} width={1440} height={900} alt="Goals and habits in dark mode" loading="lazy" />
              <figcaption>The same calm after dark. Gaia can follow your system theme.</figcaption>
            </figure>
          </div>
        </section>

        {/* Habits */}
        <section id="help-habits" className={styles.section}>
          <div className={styles.eyebrow}>Habits, gently</div>
          <h2>Rhythms, not streaks</h2>
          <p className={styles.intro}>
            A habit in Gaia is something you’d like to come back to, not a chain you have to protect. There are three
            things you can log, and nothing that means “missed”.
          </p>

          <div className={styles.grid3}>
            <LogCard kind="done" title="Done" text="You did the thing. Lovely." />
            <LogCard kind="tiny" title="Tiny" text="You did the smallest version, like stepping outside for two minutes. It counts." />
            <LogCard kind="rest" title="Rest" text="You chose to rest. That is a decision, not a failure." />
            <LogCard kind="blank" title="Blank" text="Nothing logged, and nothing stored either. Gaia has no value for “missed”." />
          </div>

          <div className={styles.card} style={{ marginTop: 16 }}>
            <b>Short walk after lunch</b> <span className={styles.muted}>· about 3 times a week</span>
            <div className={styles.rhythm} aria-label="Recent days: some done, one tiny, one rest, the rest blank">
              {[...RHYTHM].map((c, i) => (
                <i key={i} className={c === 'd' ? styles.rd : c === 't' ? styles.rt : c === 'r' ? styles.rr : undefined} />
              ))}
            </div>
            <small className={styles.soft}>2 of about 3 this week · 6 times since September</small>
          </div>
        </section>

        {/* Palettes */}
        <section id="help-palettes" className={styles.section}>
          <div className={styles.eyebrow}>Make it yours</div>
          <h2>Four paintings, four moods</h2>
          <p className={styles.intro}>
            Every colour in Gaia comes from a Monet painting. Choose one to repaint this page, the same way it repaints
            the app.
          </p>

          <div className={styles.palettes}>
            {PALETTES.map((p) => (
              <button
                key={p.value}
                type="button"
                className={styles.pal}
                aria-pressed={palette === p.value}
                onClick={() => setPalette(p.value)}
              >
                <img src={DOCS[`${p.strip}-wide.webp`]} alt="" loading="lazy" />
                <div className={styles.palBody}>
                  <div className={styles.sw}>
                    {p.swatches.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </div>
                  <b>{p.name}</b>
                  <small>{p.note}</small>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Start */}
        <section id="help-start" className={styles.section}>
          <div className={styles.eyebrow}>Getting started</div>
          <h2>Open Gaia</h2>
          <div className={styles.two}>
            <div className={styles.card}>
              <h3>The easy way</h3>
              <p className={styles.soft} style={{ margin: 0 }}>
                Double-click <b>Gaia</b> on your desktop, or <code>Start Gaia.bat</code> in the project folder. The first
                time, it installs what it needs. Then it starts the app and opens it in your browser. Keep the small
                terminal window open while you use Gaia, and close it to stop.
              </p>
            </div>
            <div className={styles.card}>
              <h3>From a terminal</h3>
              <pre>
                <code>{'npm install\nnpm run dev'}</code>
              </pre>
              <p className={styles.soft} style={{ margin: '12px 0 0' }}>
                Then open <code>http://localhost:5173</code>. Requires Node.js 18 or newer.
              </p>
            </div>
          </div>
          <div className={styles.card} style={{ marginTop: 18 }}>
            <h3>
              <Icon name="user" size={20} className={styles.h3Icon} />
              Your data stays with you
            </h3>
            <p className={styles.soft} style={{ margin: 0 }}>
              There is no account, and nothing is uploaded. Your planner lives in this browser’s <code>localStorage</code>{' '}
              (key <code>gaia:v1</code>). Clearing your browser data erases it. In <b>Settings ▸ Your data</b> you can
              export everything as JSON, restore the sample data, or delete it all (you can undo that once).
            </p>
          </div>
        </section>

        {/* Support */}
        <section className={styles.section}>
          <div className={`${styles.card} ${styles.support}`}>
            <span className={styles.badge}>
              <Icon name="heart" size={22} />
            </span>
            <p>
              <b className={styles.strong}>Gaia is a planning tool, not a health service.</b> If things feel heavy, the
              Support page in the app lists crisis and mental-health resources in Colombia (Línea 106, 123, 192 option 4)
              and internationally (
              <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
                findahelpline.com
              </a>
              ).
            </p>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <Petals />
        <div className={styles.script}>leave space · let the day unfold · make room for what matters</div>
        <div>All paintings by Claude Monet, public domain.</div>
      </footer>
    </div>
  );
}

function Petals() {
  return (
    <div className={styles.petals} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function LogCard({ kind, title, text }: { kind: 'done' | 'tiny' | 'rest' | 'blank'; title: string; text: string }) {
  return (
    <div className={`${styles.card} ${styles.log}`}>
      <div className={`${styles.dot} ${styles[kind]}`} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
