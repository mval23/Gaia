import { useEffect, useState } from 'react';
import styles from './MonetAccent.module.css';

// Every crop from scripts/crop-monet.mjs, keyed by file name ("lilies-tile").
const CROPS = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../assets/monet/*.webp', { eager: true, import: 'default' })).map(
    ([path, src]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length), src],
  ),
);

export type Shape = 'tile' | 'strip' | 'card';

const SIZE: Record<Shape, { w: number; h: number }> = {
  tile: { w: 168, h: 168 },
  strip: { w: 560, h: 120 },
  card: { w: 360, h: 240 },
};

/** The order a click steps through. `crops` names a crop when it isn't `<id>-<shape>`. */
const PAINTINGS = [
  { id: 'lilies', title: 'Water Lilies' },
  { id: 'iris', title: 'Irises by the pond' },
  { id: 'garden', title: 'The Artist’s Garden at Vétheuil' },
  { id: 'seine', title: 'The Seine at Giverny' },
  { id: 'cliff', title: 'Cliff Walk at Pourville', crops: { strip: 'sea-strip' } },
  { id: 'sunset', title: 'Sunset on the water' },
  { id: 'pond', title: 'Lily pond' },
  { id: 'rouen', title: 'Rouen Cathedral in sunlight' },
  { id: 'bridge', title: 'Waterloo Bridge at sunset' },
  { id: 'parasol', title: 'Woman with a Parasol' },
] as const satisfies readonly { id: string; title: string; crops?: Partial<Record<Shape, string>> }[];

export type PaintingId = (typeof PAINTINGS)[number]['id'];

function cropSrc(index: number, shape: Shape): string {
  const p: { id: string; crops?: Partial<Record<Shape, string>> } = PAINTINGS[index];
  return CROPS[p.crops?.[shape] ?? `${p.id}-${shape}`];
}

/** Which painting a spot shows, remembered on this device. */
function usePaintingChoice(spot: string, fallback: PaintingId) {
  const key = `gaia.monet.${spot}`;
  const indexOf = (id: string | null) => PAINTINGS.findIndex((p) => p.id === id);
  const [index, setIndex] = useState(() => {
    try {
      const saved = indexOf(localStorage.getItem(key));
      if (saved >= 0) return saved;
    } catch {
      // Non-essential preference.
    }
    return Math.max(0, indexOf(fallback));
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, PAINTINGS[index].id);
    } catch {
      // Non-essential preference.
    }
  }, [key, index]);

  return [index, () => setIndex((i) => (i + 1) % PAINTINGS.length)] as const;
}

interface MonetImageProps {
  /** Names where this image sits, so each place keeps its own painting. */
  spot: string;
  painting: PaintingId;
  shape: Shape;
  className?: string;
  imgClassName?: string;
}

/** A Monet fragment you can click to show the next painting. */
export function MonetImage({ spot, painting, shape, className, imgClassName }: MonetImageProps) {
  const [index, next] = usePaintingChoice(spot, painting);
  const { title } = PAINTINGS[index];
  const { w, h } = SIZE[shape];
  return (
    <button
      type="button"
      className={`${styles.picker} ${className ?? ''}`}
      aria-label={`Show another painting. Now showing ${title}`}
      title={`${title} · click for another painting`}
      // Keep the press from starting a drag or closing anything underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        next();
      }}
    >
      <img
        key={index}
        className={imgClassName}
        src={cropSrc(index, shape)}
        width={w}
        height={h}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </button>
  );
}

interface MonetAccentProps {
  art: PaintingId;
  phrase?: string;
  variant?: Shape;
  className?: string;
  /** Defaults to the phrase, which is unique per place. */
  spot?: string;
  /**
   * Strips only: grow to the full height of the header row instead of a fixed 40px,
   * without making that row any taller, and take a quarter of the header's width
   * (the header must be an inline-size container). The painting is cropped to fit.
   */
  fill?: boolean;
}

/**
 * A small, isolated Monet fragment. Only the painting takes pointer events, so the
 * accent never blocks drag-and-drop; clicking it switches to another painting.
 */
export function MonetAccent({ art, phrase, variant = 'tile', className, spot, fill = false }: MonetAccentProps) {
  return (
    <div className={`${styles.accent} ${styles[variant]} ${fill ? styles.fill : ''} ${className ?? ''}`}>
      <MonetImage
        spot={spot ?? phrase ?? `${art}-${variant}`}
        painting={art}
        shape={variant}
        className={fill ? styles.frame : undefined}
      />
      {phrase && (
        <span className={styles.phrase} aria-hidden="true">
          {phrase}
        </span>
      )}
    </div>
  );
}
