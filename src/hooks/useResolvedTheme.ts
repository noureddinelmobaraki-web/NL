import { useState, useEffect } from 'react';

/**
 * Reads data-theme from <html> element and updates whenever it changes.
 * Returns the resolved CSS theme string: 'dark' | 'manga-paper' | 'midnight' | 'bit'
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
    return () => observer.disconnect();
  }, []);

  return resolved;
}
