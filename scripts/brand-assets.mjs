// Generates the Gaia logo mark and favicons from the source logo in ideas/logo.png.
import sharp from 'sharp';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';

const SRC = 'ideas/logo.png';
const BG = { r: 171, g: 157, b: 206, alpha: 1 }; // #AB9DCE, the logo's lavender
const PAD = 12;
const SIDE = 460;

mkdirSync('src/assets/brand', { recursive: true });

// Find the lily's line art so the square crop keeps it optically centred.
const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}
const cx = (minX + maxX) / 2 + PAD;
const cy = (minY + maxY) / 2 + PAD;

// sharp applies extract before extend within one pipeline, so pad in a separate pass.
const padded = await sharp(SRC)
  .flatten({ background: BG })
  .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: BG })
  .png()
  .toBuffer();

// Small renditions crop tighter around the lily so its fine line stays legible.
const squareOf = (side) =>
  sharp(padded)
    .extract({ left: Math.round(cx - side / 2), top: Math.round(cy - side / 2), width: side, height: side })
    .png()
    .toBuffer();

const outputs = [
  { file: 'src/assets/brand/gaia-logo.webp', size: 144, side: 390, format: 'webp' },
  { file: 'public/favicon-32.png', size: 32, side: 340, format: 'png' },
  { file: 'public/favicon-64.png', size: 64, side: 360, format: 'png' },
  { file: 'public/apple-touch-icon.png', size: 180, side: SIDE, format: 'png' },
];

for (const o of outputs) {
  const img = sharp(await squareOf(o.side)).resize(o.size, o.size, { kernel: 'lanczos3' });
  await (o.format === 'webp' ? img.webp({ quality: 92 }) : img.png({ compressionLevel: 9 })).toFile(o.file);
  console.log(`${o.file}  ${(statSync(o.file).size / 1024).toFixed(1)} KB`);
}

// Windows icon for the desktop shortcut: a multi-size .ico with PNG-compressed entries.
const icoSizes = [16, 32, 48, 256];
const icoPngs = await Promise.all(
  icoSizes.map(async (s) =>
    sharp(await squareOf(s <= 32 ? 340 : SIDE)).resize(s, s, { kernel: 'lanczos3' }).png().toBuffer(),
  ),
);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(icoSizes.length, 4);
let icoOffset = 6 + 16 * icoSizes.length;
const icoEntries = icoPngs.map((png, i) => {
  const entry = Buffer.alloc(16);
  const side = icoSizes[i] === 256 ? 0 : icoSizes[i]; // 0 means 256 in the ICO format
  entry.writeUInt8(side, 0);
  entry.writeUInt8(side, 1);
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoOffset += png.length;
  return entry;
});
writeFileSync('public/favicon.ico', Buffer.concat([icoHeader, ...icoEntries, ...icoPngs]));
console.log(`public/favicon.ico  ${(statSync('public/favicon.ico').size / 1024).toFixed(1)} KB`);
