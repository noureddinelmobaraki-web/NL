import { useSyncExternalStore } from 'react';

export type GalleryTheme = 'dark' | 'light' | 'midnight' | 'bit' | 'lite' | 'retro';

const getThemeSnapshot = (): GalleryTheme => {
  if (typeof document === 'undefined') return 'midnight';
  return (document.documentElement.dataset.theme as GalleryTheme) || 'midnight';
};

const subscribe = (cb: () => void) => {
  if (typeof document === 'undefined') return () => {};
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => obs.disconnect();
};

/**
 * يرجع سمة المعرض الحالية ويتابع تغيّرها لحظيًا (لتطبيق هوية كل وضع على المعرض).
 */
export function useGalleryThemeSkin(): GalleryTheme {
  return useSyncExternalStore(subscribe, getThemeSnapshot, () => 'midnight');
}
