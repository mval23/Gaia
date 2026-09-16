// Builds the images used by README.md and docs/index.html:
// wide, sharp painting strips cut from the originals in monet/, and the app's
// line icons as standalone SVG files (GitHub can't render the React component).
import sharp from 'sharp';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'monet';
const OUT = 'docs/assets';
mkdirSync(join(OUT, 'icons'), { recursive: true });

// Regions are fractions of the source image: [left, top, width, height].
// Output is 5:1, large enough for the docs hero on a high-density screen.
const strips = [
  { name: 'lilies', file: '1933.1157 - Water Lilies.jpg', region: [0.02, 0.56, 0.96, 0.3] },
  { name: 'garden', file: 'the_artist_s_garden_at_vetheuil_1970.17.45.jpg', region: [0, 0.2, 1, 0.2] },
  { name: 'rouen', file: 'rouen_cathedral_west_facade_sunlight_1963.10.179.jpg', region: [0, 0.1, 1, 0.14] },
  { name: 'bridge', file: 'waterloo_bridge_london_at_sunset_1983.1.28.jpg', region: [0, 0.4, 1, 0.3] },
];

for (const s of strips) {
  const img = sharp(join(SRC, s.file));
  const { width, height } = await img.metadata();
  const [l, t, w, h] = s.region;
  const out = join(OUT, `${s.name}-wide.webp`);
  await img
    .extract({
      left: Math.round(l * width),
      top: Math.round(t * height),
      width: Math.round(w * width),
      height: Math.round(h * height),
    })
    .resize(2400, 480, { fit: 'cover' })
    .webp({ quality: 88 })
    .toFile(out);
  console.log(`${out}  ${(statSync(out).size / 1024).toFixed(0)} KB  (source ${width}x${height})`);
}

// Same paths as src/components/ui/Icon.tsx, in the app's primary ink.
const icons = {
  plan: '<circle cx="12" cy="12" r="4.1"/><path d="M12 3.2v2.3M12 18.5v2.3M3.2 12h2.3M18.5 12h2.3M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6"/>',
  calendar: '<rect x="3.75" y="5" width="16.5" height="15" rx="2.5"/><path d="M3.75 9.5h16.5M8 3v3.5M16 3v3.5"/>',
  manage: '<path d="M10 7.5h10M4 16.5h10"/><circle cx="6.5" cy="7.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.4-1.8-3.1-2.2.8a7.4 7.4 0 0 0-2.6-1.5L14.2 3h-3.6l-.4 2.3a7.4 7.4 0 0 0-2.6 1.5l-2.2-.8-1.8 3.1 1.8 1.4a7.6 7.6 0 0 0 0 3l-1.8 1.4 1.8 3.1 2.2-.8a7.4 7.4 0 0 0 2.6 1.5l.4 2.3h3.6l.4-2.3a7.4 7.4 0 0 0 2.6-1.5l2.2.8 1.8-3.1z"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  check: '<path d="m5.5 12.5 4.2 4 8.8-9"/>',
  clock: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>',
  heart: '<path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.4a4.35 4.35 0 0 1 8.25 2.2c0 5.9-8.25 10.65-8.25 10.65z"/>',
  goal: '<circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="3.25"/>',
  rhythm: '<path d="M4.75 12a7.25 7.25 0 0 1 12.4-5.1"/><path d="M19.25 12a7.25 7.25 0 0 1-12.4 5.1"/><path d="M14.5 3.75l2.9 3-3 2.9"/><path d="M9.5 20.25l-2.9-3 3-2.9"/>',
  sparkle: '<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5zM18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z"/>',
  move: '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  palette: '<path d="M12 3.75a8.25 8.25 0 1 0 0 16.5c1 0 1.6-.8 1.6-1.6 0-1.1-.9-1.4-.9-2.4 0-.9.7-1.5 1.6-1.5h2c2.2 0 3.9-1.7 3.9-3.9 0-4-3.7-7.1-8.2-7.1z"/><path d="M8 11h.01M10.5 7.5h.01M15 7.8h.01" stroke-width="2.4"/>',
  note: '<path d="M6 3.75h8.5l3.5 3.5V19a1.25 1.25 0 0 1-1.25 1.25H6A1.25 1.25 0 0 1 4.75 19V5A1.25 1.25 0 0 1 6 3.75z"/><path d="M14 3.75V7.5h4"/>',
};

for (const [name, body] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c8aa3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
  writeFileSync(join(OUT, 'icons', `${name}.svg`), svg);
}
console.log(`${Object.keys(icons).length} icons written to ${OUT}/icons`);
