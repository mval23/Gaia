import { useEffect, useRef, useState } from 'react';
import { useGaia } from '../store/GaiaProvider';
import styles from './PlansPage.module.css';

/** Built from docs/plans.html (see vite.config.ts), so the roadmap has one source. */
const PLANS_SRC = '/docs/plans.html';

/** What's coming: the illustrated roadmap, shown inside Gaia and in Gaia's light or dark. */
export function PlansPage() {
  const { state } = useGaia();
  const theme = state.settings.theme;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [missing, setMissing] = useState(false);

  const onLoad = () => {
    const d = frameRef.current?.contentDocument;
    // A missing file falls back to the app itself, which has no roadmap in it.
    if (!d || !d.querySelector('.page')) {
      setMissing(true);
      return;
    }
    setDoc(d);
  };

  useEffect(() => {
    if (!doc) return;
    const root = doc.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [doc, theme]);

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">What’s coming</h1>
      {missing ? (
        <p className={styles.missing}>The roadmap isn’t available right now. Try again in a moment.</p>
      ) : (
        <iframe ref={frameRef} src={PLANS_SRC} title="What’s coming in Gaia" className={styles.frame} onLoad={onLoad} />
      )}
    </div>
  );
}
