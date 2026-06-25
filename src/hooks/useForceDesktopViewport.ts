import { useLayoutEffect } from 'react';

/**
 * يُجبر المتصفح على "وضع سطح المكتب" للصفحة الحالية فقط على الجوال.
 * الآلية: حفظ وسم viewport الأصلي → حذفه (لإجبار iOS Safari على إعادة الحساب)
 * → إنشاء وسم جديد بعرض ثابت يسبّب zoom-out تلقائيًا. عند الإغلاق يُستعاد الأصلي حرفيًا.
 */
export function useForceDesktopViewport(desktopWidth: number = 1024, enabled: boolean = true): void {
  useLayoutEffect(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 768px)').matches;
    const active = enabled && isMobile;

    const head = document.head;
    const ORIGINAL_ATTR = 'data-original-viewport';
    const FORCE_ATTR = 'data-force-desktop-viewport';
    const CLASS_NAME = 'force-desktop-mode';

    const cleanup = () => {
      try {
        document.documentElement?.classList.remove(CLASS_NAME);
        document.body?.classList.remove(CLASS_NAME);
        head.querySelectorAll(`meta[${FORCE_ATTR}]`).forEach((tag) => tag.remove());
        const saved = head.querySelector(`meta[${ORIGINAL_ATTR}]`);
        const originalContent =
          saved?.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';
        let originalTag = head.querySelector('meta[name="viewport"]');
        if (!originalTag) {
          originalTag = document.createElement('meta');
          originalTag.setAttribute('name', 'viewport');
          head.appendChild(originalTag);
        }
        originalTag.setAttribute('content', originalContent);
        originalTag.removeAttribute(ORIGINAL_ATTR);
      } catch (e) {
        console.warn('[ForceDesktopViewport] cleanup error:', e);
      }
    };

    if (!active) { cleanup(); return; }

    try {
      document.documentElement?.classList.add(CLASS_NAME);
      document.body?.classList.add(CLASS_NAME);
      const originalTag = head.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      let originalContent = 'width=device-width, initial-scale=1, viewport-fit=cover';
      if (originalTag) {
        if (!originalTag.hasAttribute(ORIGINAL_ATTR)) {
          originalContent = originalTag.getAttribute('content') || originalContent;
          originalTag.setAttribute(ORIGINAL_ATTR, originalContent);
        } else {
          originalContent = originalTag.getAttribute(ORIGINAL_ATTR) || originalContent;
        }
        originalTag.remove();
      }
      let forceTag = head.querySelector<HTMLMetaElement>(`meta[${FORCE_ATTR}]`);
      if (!forceTag) {
        forceTag = document.createElement('meta');
        forceTag.name = 'viewport';
        forceTag.setAttribute(FORCE_ATTR, 'true');
        head.appendChild(forceTag);
      }
      forceTag.content = `width=${desktopWidth}, user-scalable=yes, viewport-fit=cover`;
    } catch (e) {
      console.warn('[ForceDesktopViewport] setup error:', e);
    }

    return () => cleanup();
  }, [desktopWidth, enabled]);
}
