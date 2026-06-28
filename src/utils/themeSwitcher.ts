import type { Theme } from './userPrefs';

const SWITCH_CLASS = 'theme-switching';
const SWITCH_DURATION = 500; // ms — keep in sync with longest CSS transition

export function applyTheme(next: Theme): void {
  const root = document.documentElement;
  root.classList.add(SWITCH_CLASS);
  const doSwap = () => { root.setAttribute('data-theme', next); };

  if (typeof document.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    try {
      const transition = document.startViewTransition(doSwap);
      if (transition) {
        transition.finished?.finally(() => root.classList.remove(SWITCH_CLASS)).catch(() => {});
        transition.ready?.catch(() => {});
        transition.updateCallbackDone?.catch(() => {});
      }
    } catch (e) {
      doSwap();
    }
  } else {
    doSwap();
  }
  window.setTimeout(() => { root.classList.remove(SWITCH_CLASS); }, SWITCH_DURATION);
}

export function withViewTransition(fn: () => void) {
  if (typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fn();
    return;
  }
  document.startViewTransition(fn);
}
