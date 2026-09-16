import liliesTile from '../../assets/monet/lilies-tile.webp';
import liliesStrip from '../../assets/monet/lilies-strip.webp';
import seineStrip from '../../assets/monet/seine-strip.webp';
import gardenCard from '../../assets/monet/garden-card.webp';
import irisTile from '../../assets/monet/iris-tile.webp';
import cliffTile from '../../assets/monet/cliff-tile.webp';
import sunsetStrip from '../../assets/monet/sunset-strip.webp';
import seaStrip from '../../assets/monet/sea-strip.webp';
import pondCard from '../../assets/monet/pond-card.webp';
import styles from './MonetAccent.module.css';

const ART = {
  liliesTile: { src: liliesTile, w: 168, h: 168 },
  liliesStrip: { src: liliesStrip, w: 560, h: 120 },
  seineStrip: { src: seineStrip, w: 480, h: 108 },
  gardenCard: { src: gardenCard, w: 360, h: 240 },
  irisTile: { src: irisTile, w: 168, h: 168 },
  cliffTile: { src: cliffTile, w: 168, h: 168 },
  sunsetStrip: { src: sunsetStrip, w: 560, h: 120 },
  seaStrip: { src: seaStrip, w: 480, h: 108 },
  pondCard: { src: pondCard, w: 360, h: 240 },
} as const;

export type ArtName = keyof typeof ART;

interface MonetAccentProps {
  art: ArtName;
  phrase?: string;
  variant?: 'tile' | 'strip' | 'card';
  className?: string;
  /**
   * Strips only: grow to the full height of the header row instead of a fixed 40px,
   * without making that row any taller, and take a quarter of the header's width
   * (the header must be an inline-size container). The painting is cropped to fit.
   */
  fill?: boolean;
}

/**
 * A small, isolated Monet fragment. Purely decorative: hidden from assistive tech
 * and transparent to pointer events so it can never block drag-and-drop.
 */
export function MonetAccent({ art, phrase, variant = 'tile', className, fill = false }: MonetAccentProps) {
  const a = ART[art];
  const img = <img src={a.src} width={a.w} height={a.h} alt="" loading="lazy" decoding="async" draggable={false} />;
  return (
    <div
      className={`${styles.accent} ${styles[variant]} ${fill ? styles.fill : ''} ${className ?? ''}`}
      aria-hidden="true"
    >
      {fill ? (
        <span className={styles.frame}>{img}</span>
      ) : (
        img
      )}
      {phrase && <span className={styles.phrase}>{phrase}</span>}
    </div>
  );
}
