/** Opened from the home screen, full screen, rather than in a browser tab. */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** iPhones and iPads, where installing and notifications both go through Safari's Share menu. */
export const isAppleMobile = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
