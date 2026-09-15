import liliesTile from '../../assets/monet/lilies-tile.webp';
import liliesStrip from '../../assets/monet/lilies-strip.webp';
import seineStrip from '../../assets/monet/seine-strip.webp';
import gardenCard from '../../assets/monet/garden-card.webp';
import styles from './MonetAccent.module.css';

const ART = {
  liliesTile: { src: liliesTile, w: 168, h: 168 },
  liliesStrip: { src: liliesStrip, w: 560, h: 120 },
  seineStrip: { src: seineStrip, w: 480, h: 108 },
  gardenCard: { src: gardenCard, w: 360, h: 240 },
} as const;

export type ArtName = keyof typeof ART;

interface MonetAccentProps {
  art: ArtName;
  phrase?: string;
  variant?: 'tile' | 'strip' | 'card';
  className?: string;
}

/**
 * A small, isolated Monet fragment. Purely decorative: hidden from assistive tech
 * and transparent to pointer events so it can never block drag-and-drop.
 */
export function MonetAccent({ art, phrase, variant = 'tile', className }: MonetAccentProps) {
  const a = ART[art];
  return (
    <div className={`${styles.accent} ${styles[variant]} ${className ?? ''}`} aria-hidden="true">
      <img src={a.src} width={a.w} height={a.h} alt="" loading="lazy" decoding="async" draggable={false} />
      {phrase && <span className={styles.phrase}>{phrase}</span>}
    </div>
  );
}
