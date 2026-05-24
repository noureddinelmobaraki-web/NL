import { useState, useEffect } from 'react';

/**
 * Reads data-theme from <html> element and updates whenever it changes.
 * Returns the resolved CSS theme string: 'dark' | 'light' | 'midnight' | 'bit'
 */
export function useResolvedTheme(): string {
  const [resolved, setResolved] = useState<string>(
    () => document.documentElement.dataset.theme ?? 'midnight'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.dataset.theme ?? 'midnight';
      setResolved(current);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      // Small timeout to allow attribute update in App.tsx to settle
      setTimeout(() => {
        setResolved(document.documentElement.dataset.theme ?? 'midnight');
      }, 50);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  return resolved;
}
