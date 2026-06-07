/**
 * Centralized runtime environment detection.
 * Replaces scattered `(navigator as any).webdriver` casts.
 */
interface NavigatorWithWebdriver extends Navigator {
  webdriver?: boolean;
}

export const isAutomatedEnv = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (navigator as NavigatorWithWebdriver).webdriver === true;
};

export const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};
