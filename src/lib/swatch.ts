/**
 * Category and group colours.
 *
 * Saved data keeps the hex a colour was picked as, so exports and older saves
 * stay readable. Anything that paints a colour goes through `paint`, which
 * swaps a known hex for its token in tokens.css: that token follows the
 * palette and the theme. A hex Gaia doesn't know is painted as it is.
 *
 * The tokens are generated from the same list in scripts/gen-tokens.mjs.
 */

export interface Swatch {
  name: string;
  value: string;
  token: string;
}

export const CATEGORY_PALETTE: Swatch[] = [
  { name: 'Dusty lavender', value: '#B3A7D6', token: 'lavender' },
  { name: 'Powder blue', value: '#A9C3E0', token: 'powder-blue' },
  { name: 'Muted sage', value: '#A3C29D', token: 'sage' },
  { name: 'Pale sage', value: '#BDD3B0', token: 'pale-sage' },
  { name: 'Water-lily pink', value: '#E6BCCB', token: 'lily-pink' },
  { name: 'Eucalyptus', value: '#9FD0BA', token: 'eucalyptus' },
  { name: 'Sand', value: '#D9CBBE', token: 'sand' },
  { name: 'Blue-grey', value: '#B6C3D6', token: 'blue-grey' },
  { name: 'Mist', value: '#C8C6D0', token: 'mist' },
  { name: 'Peach', value: '#E8C6AE', token: 'peach' },
];

export const GROUP_PALETTE: Swatch[] = [
  { name: 'Slate', value: '#A7B6CC', token: 'slate' },
  { name: 'Heather', value: '#CDB4C3', token: 'heather' },
  { name: 'Lichen', value: '#C3C9BE', token: 'lichen' },
  { name: 'Linen', value: '#C9BBA9', token: 'linen' },
  { name: 'Seafoam', value: '#B4C8C4', token: 'seafoam' },
  { name: 'Wisteria', value: '#BDB3D2', token: 'wisteria' },
];

const TOKENS = new Map([...CATEGORY_PALETTE, ...GROUP_PALETTE].map((s) => [s.value.toLowerCase(), s.token]));

/** The CSS colour to paint a saved category or group colour with. */
export function paint(color: string): string;
export function paint(color: string | undefined): string | undefined;
export function paint(color: string | undefined): string | undefined {
  if (!color) return color;
  const token = TOKENS.get(color.toLowerCase());
  return token ? `var(--swatch-${token}, ${color})` : color;
}
