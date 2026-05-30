import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

let observer: MutationObserver | null = null;
let mediaQuery: MediaQueryList | null = null;
let handleMediaChange: (() => void) | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (listeners.size === 1) {
    if (typeof window !== 'undefined') {
      observer = new MutationObserver(() => {
        listeners.forEach(cb => cb());
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });

      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      handleMediaChange = () => {
        listeners.forEach(cb => cb());
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else {
        mediaQuery.addListener(handleMediaChange);
      }
    }
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (mediaQuery && handleMediaChange) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMediaChange);
        } else {
          mediaQuery.removeListener(handleMediaChange);
        }
        mediaQuery = null;
        handleMediaChange = null;
      }
    }
  };
}

function getSnapshot() {
  if (typeof window === 'undefined') return 'midnight';
  return document.documentElement.dataset.theme ?? 'midnight';
}

function getServerSnapshot() {
  return 'midnight';
}

/**
 * Reads data-theme from <html> element and updates whenever it changes.
 * Returns the resolved CSS theme string: 'dark' | 'light' | 'midnight' | 'bit'
 */
export function useResolvedTheme(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
