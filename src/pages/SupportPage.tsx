import { Link } from 'react-router-dom';
import { MonetAccent } from '../components/art/MonetAccent';
import styles from './SupportPage.module.css';

/**
 * Deliberately static. Gaia does not read what you write and does not try to
 * work out how you are doing; it just keeps help easy to find.
 */
export function SupportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Support</p>
          <h1 className={styles.title}>If things feel heavy</h1>
          <p className={styles.lede}>
            Gaia is a planning tool. It is not a medical or mental-health service, and it cannot tell how you are
            doing. If you need someone, these people are there for exactly this.
          </p>
        </div>
        <MonetAccent art="cliffTile" phrase="slow is still moving" />
      </header>

      <section className={`${styles.tier} ${styles.now}`} aria-labelledby="tier-now">
        <h2 id="tier-now" className={styles.tierTitle}>
          Right now
        </h2>
        <p className={styles.tierWhen}>
          If you are thinking of harming yourself or someone else, or you do not feel safe.
        </p>
        <ul className={styles.lines}>
          <li>
            <a href="tel:106">
              <strong>Línea 106</strong>
            </a>{' '}
            — free, confidential mental-health support, 24 hours a day, across Colombia.
          </li>
          <li>
            <a href="tel:123">
              <strong>123</strong>
            </a>{' '}
            — emergencies.
          </li>
          <li>
            <a href="tel:192">
              <strong>Línea 192</strong>
            </a>{' '}
            — the health ministry line; choose option 4 for mental health.
          </li>
          <li>
            Somewhere else in the world:{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
              findahelpline.com
            </a>{' '}
            lists vetted helplines by country.
          </li>
        </ul>
      </section>

      <section className={`${styles.tier} ${styles.weeks}`} aria-labelledby="tier-weeks">
        <h2 id="tier-weeks" className={styles.tierTitle}>
          If it has lasted more than a couple of weeks
        </h2>
        <p className={styles.tierWhen}>Any of these is reason enough to talk to a doctor or a mental-health professional.</p>
        <ul className={styles.bullets}>
          <li>Low mood, hopelessness, or losing interest in things you used to enjoy</li>
          <li>Everyday tasks feeling impossible</li>
          <li>Big changes in how you sleep or eat</li>
          <li>Worry or panic getting in the way of your day</li>
          <li>Using alcohol or drugs to cope</li>
        </ul>
      </section>

      <section className={`${styles.tier} ${styles.extra}`} aria-labelledby="tier-extra">
        <h2 id="tier-extra" className={styles.tierTitle}>
          Worth extra support
        </h2>
        <ul className={styles.bullets}>
          <li>Planning or tracking starts to feel compulsive rather than useful</li>
          <li>Goals about food, weight or your body feel distressing</li>
        </ul>
        <p className={styles.tierWhen}>
          A professional can help with both. In the meantime, you can turn off every count in{' '}
          <Link to="/manage/habits">your habits</Link> and in Settings, or let a habit rest for as long as you like.
          Nothing in Gaia keeps score.
        </p>
      </section>

      <p className={styles.footNote}>
        Your planner stays on this device. Gaia has no account, sends nothing anywhere, and never reads your
        reflections.
      </p>
    </div>
  );
}
