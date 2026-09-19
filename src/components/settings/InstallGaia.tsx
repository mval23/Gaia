import { useEffect, useState } from 'react';
import { useFeedback } from '../../store/GaiaProvider';
import ui from '../ui/ui.module.css';
import settings from '../../pages/SettingsPage.module.css';

/** Chrome and Edge's install event. Safari has none: there it's Share ▸ Add to Home Screen. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isAppleMobile = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Keep Gaia on the home screen, where the browser allows it. Shown only when it can help. */
export function InstallGaia() {
  const { notify } = useFeedback();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!prompt && !isAppleMobile())) return null;

  return (
    <section className={settings.group} aria-labelledby="install-gaia">
      <h2 id="install-gaia" className={settings.groupTitle}>
        On your home screen
      </h2>
      <p className={settings.hint}>Keep Gaia beside your other apps. It opens full screen, without the browser around it.</p>
      {prompt ? (
        <div className={settings.actions}>
          <button
            type="button"
            className={ui.secondaryButton}
            onClick={async () => {
              await prompt.prompt();
              const { outcome } = await prompt.userChoice;
              setPrompt(null);
              if (outcome === 'accepted') notify('Gaia is on your home screen');
            }}
          >
            Add to home screen
          </button>
        </div>
      ) : (
        <p className={settings.hint}>In Safari, tap Share, then Add to Home Screen.</p>
      )}
    </section>
  );
}
