import { useMemo, useEffect } from 'react';
import { getThemedImage } from '../constants/assets';
import { useResolvedTheme } from './useResolvedTheme';

type ImageKey = Parameters<typeof getThemedImage>[0];

const preloadedUrls = new Set<string>();

export function useThemeAwareAsset(key: ImageKey, { preload = false } = {}) {
  const theme = useResolvedTheme();
  const url = useMemo(() => getThemedImage(key, theme), [key, theme]);

  useEffect(() => {
    if (!preload || preloadedUrls.has(url)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
    preloadedUrls.add(url);
    return () => {
      link.remove();
    };
  }, [url, preload]);

  return url;
}
