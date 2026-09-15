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
