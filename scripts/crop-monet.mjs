// Generates small, recognisable Monet crops for decorative accents.
// Originals in monet/ are never bundled; only these outputs are imported by the app.
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'monet';
const OUT = 'src/assets/monet';
mkdirSync(OUT, { recursive: true });

// Regions are fractions of the source image: [left, top, width, height].
const crops = [
  { name: 'lilies-tile', file: '1933.1157 - Water Lilies.jpg', region: [0.5, 0.63, 0.2, 0.21], size: [168, 168] },
  { name: 'lilies-strip', file: '1933.1157 - Water Lilies.jpg', region: [0.04, 0.62, 0.92, 0.2], size: [560, 120] },
  { name: 'seine-strip', file: 'the_seine_at_giverny_1963.10.180.jpg', region: [0.02, 0.4, 0.96, 0.26], size: [480, 108] },
  { name: 'garden-card', file: 'the_artist_s_garden_at_vetheuil_1970.17.45.jpg', region: [0.1, 0.42, 0.62, 0.34], size: [360, 240] },
  // Added later: irises, a sunset reflection, a darker lily pond, and the sea at Pourville.
  { name: 'iris-tile', file: 'pond.jpg', region: [0.01, 0.18, 0.33, 0.24], size: [168, 168] },
  { name: 'sunset-strip', file: 'labre.jpg', region: [0.02, 0.42, 0.96, 0.22], size: [560, 120] },
  { name: 'pond-card', file: 'water_lilies.jpg', region: [0.06, 0.6, 0.52, 0.36], size: [360, 240] },
  { name: 'sea-strip', file: 'cliff-walk-at-pourville.jpg', region: [0.02, 0.38, 0.4, 0.12], size: [480, 108] },
  { name: 'cliff-tile', file: 'cliff-walk-at-pourville.jpg', region: [0.57, 0.31, 0.21, 0.25], size: [168, 168] },
  // Every painting in every shape, so each accent can be switched to any of them.
  // (Morning Haze is left out: at this size it reads as an empty box.)
  { name: 'lilies-card', file: '1933.1157 - Water Lilies.jpg', region: [0.05, 0.62, 0.5, 0.35], size: [360, 240] },
  { name: 'cliff-card', file: 'cliff-walk-at-pourville.jpg', region: [0.35, 0.2, 0.5, 0.42], size: [360, 240] },
  { name: 'sunset-tile', file: 'labre.jpg', region: [0.3, 0.25, 0.3, 0.4], size: [168, 168] },
  { name: 'sunset-card', file: 'labre.jpg', region: [0.15, 0.15, 0.63, 0.56], size: [360, 240] },
  { name: 'iris-strip', file: 'pond.jpg', region: [0, 0.3, 1, 0.155], size: [560, 120] },
  { name: 'iris-card', file: 'pond.jpg', region: [0, 0.2, 0.75, 0.36], size: [360, 240] },
  { name: 'rouen-tile', file: 'rouen_cathedral_west_facade_sunlight_1963.10.179.jpg', region: [0.2, 0.08, 0.6, 0.39], size: [168, 168] },
  { name: 'rouen-strip', file: 'rouen_cathedral_west_facade_sunlight_1963.10.179.jpg', region: [0, 0.1, 1, 0.14], size: [560, 120] },
  { name: 'rouen-card', file: 'rouen_cathedral_west_facade_sunlight_1963.10.179.jpg', region: [0.05, 0.08, 0.9, 0.39], size: [360, 240] },
  { name: 'garden-tile', file: 'the_artist_s_garden_at_vetheuil_1970.17.45.jpg', region: [0, 0.2, 0.4, 0.32], size: [168, 168] },
  { name: 'garden-strip', file: 'the_artist_s_garden_at_vetheuil_1970.17.45.jpg', region: [0, 0.22, 1, 0.17], size: [560, 120] },
  { name: 'seine-tile', file: 'the_seine_at_giverny_1963.10.180.jpg', region: [0.52, 0.2, 0.35, 0.43], size: [168, 168] },
  { name: 'seine-card', file: 'the_seine_at_giverny_1963.10.180.jpg', region: [0.2, 0.2, 0.7, 0.58], size: [360, 240] },
  { name: 'bridge-tile', file: 'waterloo_bridge_london_at_sunset_1983.1.28.jpg', region: [0, 0.4, 0.3, 0.42], size: [168, 168] },
  { name: 'bridge-strip', file: 'waterloo_bridge_london_at_sunset_1983.1.28.jpg', region: [0, 0.38, 1, 0.3], size: [560, 120] },
  { name: 'bridge-card', file: 'waterloo_bridge_london_at_sunset_1983.1.28.jpg', region: [0, 0.3, 0.6, 0.57], size: [360, 240] },
  { name: 'pond-tile', file: 'water_lilies.jpg', region: [0.1, 0.55, 0.4, 0.45], size: [168, 168] },
  { name: 'pond-strip', file: 'water_lilies.jpg', region: [0, 0.05, 1, 0.24], size: [560, 120] },
  { name: 'parasol-tile', file: 'woman_with_a_parasol_-_madame_monet_and_her_son_1983.1.29.jpg', region: [0.25, 0.05, 0.62, 0.5], size: [168, 168] },
  { name: 'parasol-strip', file: 'woman_with_a_parasol_-_madame_monet_and_her_son_1983.1.29.jpg', region: [0, 0.05, 1, 0.17], size: [560, 120] },
  { name: 'parasol-card', file: 'woman_with_a_parasol_-_madame_monet_and_her_son_1983.1.29.jpg', region: [0.05, 0.1, 0.93, 0.5], size: [360, 240] },
];

for (const c of crops) {
  const img = sharp(join(SRC, c.file));
  const { width, height } = await img.metadata();
  const [l, t, w, h] = c.region;
  const out = join(OUT, `${c.name}.webp`);
  await img
    .extract({
      left: Math.round(l * width),
      top: Math.round(t * height),
      width: Math.round(w * width),
      height: Math.round(h * height),
    })
    .resize(c.size[0], c.size[1], { fit: 'cover' })
    .webp({ quality: 78 })
    .toFile(out);
  console.log(`${out}  ${(statSync(out).size / 1024).toFixed(1)} KB`);
}
