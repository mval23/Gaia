import { writeFileSync } from 'node:fs';

// Each palette is drawn from one of the paintings in monet/.
export const palettes = {
  lilies: {
    label: 'Water Lilies',
    light: { bg: '#f5f2ed', surface: '#fbfaf7', 'surface-strong': '#ffffff', panel: '#f8f6f2', 'panel-inset': '#f3f1ed', primary: '#5b6679', avatar: '#ab9dce', 'avatar-quiet': '#b9c2d4', 'chip-today-bg': 'rgba(169, 195, 224, 0.35)', 'chip-today-ink': '#3f4c61' },
    dark: { bg: '#141922', surface: '#1b212d', 'surface-strong': '#212936', panel: '#222938', 'panel-inset': '#1e2430', primary: '#8fa0bd', avatar: '#a99cd0', 'avatar-quiet': '#8d97ab', 'chip-today-bg': 'rgba(169, 195, 224, 0.22)', 'chip-today-ink': '#cfdcec' },
  },
  rouen: {
    label: 'Rouen Cathedral',
    light: { bg: '#f7f2e9', surface: '#fdfaf4', 'surface-strong': '#ffffff', panel: '#f9f4ec', 'panel-inset': '#f3ede2', primary: '#6b5f4e', avatar: '#d3b58a', 'avatar-quiet': '#c9bda9', 'chip-today-bg': 'rgba(211, 181, 138, 0.32)', 'chip-today-ink': '#5d5140' },
    dark: { bg: '#1a1712', surface: '#221e18', 'surface-strong': '#29241d', panel: '#2a251d', 'panel-inset': '#241f19', primary: '#c2a883', avatar: '#d3b58a', 'avatar-quiet': '#a99c87', 'chip-today-bg': 'rgba(211, 181, 138, 0.2)', 'chip-today-ink': '#e6d3b4' },
  },
  giverny: {
    label: 'Garden at Giverny',
    light: { bg: '#f1f4ee', surface: '#fafcf8', 'surface-strong': '#ffffff', panel: '#f3f6f0', 'panel-inset': '#ecf0e8', primary: '#4f6350', avatar: '#9fc39b', 'avatar-quiet': '#b3c2ae', 'chip-today-bg': 'rgba(159, 195, 155, 0.32)', 'chip-today-ink': '#3f5140' },
    dark: { bg: '#121711', surface: '#1a201a', 'surface-strong': '#202820', panel: '#212921', 'panel-inset': '#1c231c', primary: '#93b78f', avatar: '#9fc39b', 'avatar-quiet': '#8a9b87', 'chip-today-bg': 'rgba(159, 195, 155, 0.2)', 'chip-today-ink': '#c8dcc4' },
  },
  waterloo: {
    label: 'Waterloo Bridge',
    light: { bg: '#f3f1f4', surface: '#fbfafc', 'surface-strong': '#ffffff', panel: '#f4f1f6', 'panel-inset': '#eeeaf1', primary: '#5c5570', avatar: '#c8a9c4', 'avatar-quiet': '#b8b0c6', 'chip-today-bg': 'rgba(200, 169, 196, 0.3)', 'chip-today-ink': '#4e4560' },
    dark: { bg: '#16131a', surface: '#1e1a24', 'surface-strong': '#251f2c', panel: '#262130', 'panel-inset': '#201c28', primary: '#b6a3c8', avatar: '#c8a9c4', 'avatar-quiet': '#9990a6', 'chip-today-bg': 'rgba(200, 169, 196, 0.2)', 'chip-today-ink': '#e0cfe0' },
  },
};

// Category and group colours. Saved data keeps the hex a colour was picked as;
// src/lib/swatch.ts paints each one through its token here, so it follows the
// palette and the theme. Keep the two lists in step (a test checks).
export const swatches = {
  // Categories
  lavender: '#b3a7d6',
  'powder-blue': '#a9c3e0',
  sage: '#a3c29d',
  'pale-sage': '#bdd3b0',
  'lily-pink': '#e6bccb',
  eucalyptus: '#9fd0ba',
  sand: '#d9cbbe',
  'blue-grey': '#b6c3d6',
  mist: '#c8c6d0',
  peach: '#e8c6ae',
  // Groups
  slate: '#a7b6cc',
  heather: '#cdb4c3',
  lichen: '#c3c9be',
  linen: '#c9bba9',
  seafoam: '#b4c8c4',
  wisteria: '#bdb3d2',
};

// How far each painting moves every swatch, in oklab (a: green to red, b: blue
// to yellow). The whole set moves together, so no two swatches drift into each
// other. Water Lilies is where the swatches were picked, so it keeps them.
const swatchShift = {
  lilies: { a: 0, b: 0 },
  rouen: { a: 0.012, b: 0.045 },
  giverny: { a: -0.035, b: 0.022 },
  waterloo: { a: 0.03, b: -0.014 },
};

// Browsers without relative colours get a light blend toward the painting's --avatar.
const swatchKeep = { lilies: '100%', rouen: '78%', giverny: '80%', waterloo: '80%' };

const swatchTokens = Object.entries(swatches)
  .map(
    ([name, hex]) =>
      `  --swatch-${name}: color-mix(in oklab, color-mix(in oklab, ${hex} var(--swatch-keep), var(--avatar)) var(--swatch-lift), var(--bg));`,
  )
  .join('\n');

const shiftedSwatchTokens = Object.entries(swatches)
  .map(
    ([name, hex]) =>
      `    --swatch-${name}: oklab(from ${hex} calc(l + var(--swatch-shift-l)) calc(a + var(--swatch-shift-a)) calc(b + var(--swatch-shift-b)));`,
  )
  .join('\n');

const shared = `
  /* Text */
  --text: #2b3445;
  --text-secondary: #5f6a7d;
  --text-tertiary: #7c8698;
  --text-inverse: #ffffff;

  /* Lines, tints & depth */
  --border: rgba(43, 52, 69, 0.08);
  --border-strong: rgba(43, 52, 69, 0.22);
  --hover: rgba(43, 52, 69, 0.045);
  --pressed: rgba(43, 52, 69, 0.08);
  --tint-weak: rgba(43, 52, 69, 0.05);
  --tint: rgba(43, 52, 69, 0.1);
  --tint-strong: rgba(43, 52, 69, 0.18);
  --scrim: rgba(43, 52, 69, 0.14);
  --grid-hour: rgba(43, 52, 69, 0.08);
  --grid-half: rgba(43, 52, 69, 0.035);
  --shadow-sm: 0 1px 2px rgba(43, 52, 69, 0.04);
  --shadow: 0 1px 2px rgba(43, 52, 69, 0.04), 0 8px 24px rgba(43, 52, 69, 0.05);
  --shadow-lg: 0 2px 6px rgba(43, 52, 69, 0.06), 0 20px 48px rgba(43, 52, 69, 0.12);

  /* Accents */
  --navy: #2b3445;
  --now: #e06c75;
  --danger: #b4565e;
  --focus: #2b3445;
  --selected: #ffffff;
  --block-ink: #4c5669;
  --inverse-surface: #1f2735;

  /* The shape of a day, and time kept for rest. Mixed from the painting's own
     swatches, so they follow the palette and settle into the dark ground. */
  --shape-mix: 34%;
  --shape-gentle: color-mix(in srgb, var(--swatch-powder-blue) var(--shape-mix), var(--surface));
  --shape-steady: color-mix(in srgb, var(--swatch-sage) var(--shape-mix), var(--surface));
  --shape-bright: color-mix(in srgb, var(--swatch-peach) var(--shape-mix), var(--surface));
  --shape-gentle-ink: var(--text);
  --shape-steady-ink: var(--text);
  --shape-bright-ink: var(--text);
  --rest: color-mix(in srgb, var(--swatch-sand) var(--shape-mix), var(--surface));
  --rest-edge: color-mix(in srgb, var(--swatch-sand) 70%, transparent);
  --anchor: color-mix(in srgb, var(--swatch-sand) 60%, var(--text-tertiary));

  /* Glass: navigation, popovers, sheet only. Derived from the surface, so it
     follows both the theme and the palette without being restated. */
  --glass: color-mix(in srgb, var(--surface) 86%, transparent);
  --glass-strong: color-mix(in srgb, var(--surface) 94%, transparent);
  --glass-blur: saturate(140%) blur(14px);

  /* Category and group colours: each saved hex, tinted toward the painting and,
     in dark, settled into the ground. See src/lib/swatch.ts. */
  --swatch-keep: ${swatchKeep.lilies};
  --swatch-lift: 100%;
  --swatch-shift-l: 0;
  --swatch-shift-a: ${swatchShift.lilies.a};
  --swatch-shift-b: ${swatchShift.lilies.b};
${swatchTokens}`;

const sharedDark = `
  /* Text */
  --text: #e6e9ef;
  --text-secondary: #b3bbc9;
  --text-tertiary: #8f98a9;
  --text-inverse: #141922;

  /* Lines, tints & depth */
  --border: rgba(230, 233, 239, 0.12);
  --border-strong: rgba(230, 233, 239, 0.26);
  --hover: rgba(230, 233, 239, 0.06);
  --pressed: rgba(230, 233, 239, 0.1);
  --tint-weak: rgba(230, 233, 239, 0.06);
  --tint: rgba(230, 233, 239, 0.12);
  --tint-strong: rgba(230, 233, 239, 0.2);
  --scrim: rgba(0, 0, 0, 0.5);
  --grid-hour: rgba(230, 233, 239, 0.1);
  --grid-half: rgba(230, 233, 239, 0.05);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.4), 0 20px 48px rgba(0, 0, 0, 0.5);

  /* Accents */
  --navy: #e6e9ef;
  --now: #e8848c;
  --danger: #e0929a;
  --focus: #e6e9ef;
  --selected: #2b3342;
  --block-ink: #cbd3e0;
  --inverse-surface: #2a3140;

  /* Swatches sink into the dark ground, so they glow less. */
  --swatch-lift: 82%;
  --swatch-shift-l: -0.14;

  /* The day's shapes are quieter after dark, as everything else is. */
  --shape-mix: 24%;`;

const shape = `
  /* Shape */
  --radius-sm: 8px;
  --radius: 10px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* Type */
  /* Playfair Display for titles, the wordmark and Monet phrases; Inter for all functional UI */
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, 'Helvetica Neue', Arial, sans-serif;
  --font-heading: 'Playfair Display', 'Iowan Old Style', Georgia, serif;
  --font-display: var(--font-heading);
  --font-sans: var(--font-body);

  /* Layout */
  /* Desktop navigation lives in the sidebar, so there is no top bar to subtract */
  --nav-h: 0px;
  --sidebar-w: 272px;
  --sidebar-rail: 80px;
  --gutter: 32px;
  --content-max: 1440px;

  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --spring: cubic-bezier(0.34, 1.3, 0.64, 1);`;

const vars = (obj, indent) =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}--${k}: ${v};`)
    .join('\n');

const indentBlock = (block, indent) => block.replace(/^ {2}(?=\S|\/)/gm, indent);

let out = `/*
 * Every colour in Gaia comes from here.
 *
 * Three axes: the theme (light, dark, or whatever the system asks for), the
 * palette (one of four paintings), and the tokens themselves. Components never
 * name a colour directly, which is what makes a new palette a few lines rather
 * than a rewrite.
 *
 * Regenerate with: node scripts/gen-tokens.mjs
 */

:root {
  /* Surfaces: a plain painted ground, never an image */
${vars(palettes.lilies.light, '  ')}
${shared}
${shape}
}

/* ---------- Dark, when the system asks and nothing overrides ---------- */

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${vars(palettes.lilies.dark, '    ')}
${indentBlock(sharedDark, '    ')}
  }
}

/* ---------- Dark, chosen explicitly ---------- */

:root[data-theme='dark'] {
${vars(palettes.lilies.dark, '  ')}
${sharedDark}
}
`;

for (const [name, p] of Object.entries(palettes)) {
  if (name === 'lilies') continue;
  out += `
/* ---------- ${p.label} ---------- */

:root[data-palette='${name}'] {
${vars(p.light, '  ')}
  --swatch-keep: ${swatchKeep[name]};
  --swatch-shift-a: ${swatchShift[name].a};
  --swatch-shift-b: ${swatchShift[name].b};
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light'])[data-palette='${name}'] {
${vars(p.dark, '    ')}
  }
}

:root[data-theme='dark'][data-palette='${name}'] {
${vars(p.dark, '  ')}
}
`;
}

out += `
/* ---------- Swatches, moved whole by the palette and the theme ---------- */

@supports (color: oklab(from red l a b)) {
  :root {
${shiftedSwatchTokens}
  }
}

@media (max-width: 1023px) {
  :root {
    --gutter: 24px;
  }
}

@media (max-width: 767px) {
  :root {
    --gutter: 16px;
    --nav-h: 56px;
  }
}
`;

writeFileSync('src/styles/tokens.css', out);
console.log('tokens.css written');
