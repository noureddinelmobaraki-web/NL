import { useLayoutEffect } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Hook يُجبر المتصفح على تطبيق "وضع سطح المكتب" على الصفحة الحالية فقط.
 * 
 * الآلية:
 *  - عند mount: يحفظ الـ viewport meta tag الأصلي، يحذفه، ثم يُنشئ tag جديد
 *    بعرض ثابت (1024px افتراضياً) — هذا يجعل المتصفح يعمل zoom-out تلقائياً.
 *  - عند unmount: يحذف الـ tag الجديد ويُعيد الأصلي حرفياً.
 * 
 * لماذا "حذف + إنشاء" بدلاً من تعديل content فقط؟
 *  - بعض إصدارات iOS Safari لا تعيد حساب الـ Viewport عند تغيير `content`
 *    لـ tag موجود مسبقاً. الحذف والإنشاء يُجبر إعادة التقييم.
 * 
 * @param desktopWidth العرض المنطقي للصفحة (افتراضي 1024px).
 * @param enabled تفعيل/تعطيل الـ Hook (مفيد للاختبار).
 */
export function useRetroViewport(
  desktopWidth: number = 1024,
  enabled: boolean = true
): void {
  let theme = 'retro';
  try {
    const context = useAppContext();
    theme = context?.theme ?? 'retro';
  } catch {
    // خارج سياق الـ Context (مفيد للاختبارات الفردية)
  }

  useLayoutEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    const isRetroActive = enabled && isMobile;

    const head = document.head;
    const ORIGINAL_ATTR = 'data-original-viewport';
    const RETRO_ATTR = 'data-retro-viewport';
    const CLASS_NAME = 'retro-desktop-mode';

    const cleanup = () => {
      try {
        // إزالة الكلاس من الـ HTML والـ Body
        document.documentElement?.classList.remove(CLASS_NAME);
        document.body?.classList.remove(CLASS_NAME);

        // إزالة وسوم الـ viewport التي تم إنشاؤها لـ Retro
        const retroTags = head.querySelectorAll(`meta[${RETRO_ATTR}]`);
        retroTags.forEach((tag) => tag.remove());

        // استعادة الـ viewport الأصلي إن وجد
        const savedOriginal = head.querySelector(`meta[${ORIGINAL_ATTR}]`);
        const originalContent = savedOriginal?.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

        let originalTag = head.querySelector('meta[name="viewport"]');
        if (!originalTag) {
          originalTag = document.createElement('meta');
          originalTag.setAttribute('name', 'viewport');
          head.appendChild(originalTag);
        }
        originalTag.setAttribute('content', originalContent);
        originalTag.removeAttribute(ORIGINAL_ATTR);
      } catch (e) {
        console.warn('[RetroViewport] Cleanup error:', e);
      }
    };

    if (!isRetroActive) {
      cleanup();
      return;
    }

    try {
      // تفعيل كلاس الأمان على html و body
      document.documentElement?.classList.add(CLASS_NAME);
      document.body?.classList.add(CLASS_NAME);

      // تحديد الـ tag الأصلي وحفظ محتواه
      const originalTag = head.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      let originalContent = 'width=device-width, initial-scale=1, viewport-fit=cover';

      if (originalTag) {
        if (!originalTag.hasAttribute(ORIGINAL_ATTR)) {
          originalContent = originalTag.getAttribute('content') || originalContent;
          originalTag.setAttribute(ORIGINAL_ATTR, originalContent);
        } else {
          originalContent = originalTag.getAttribute(ORIGINAL_ATTR) || originalContent;
        }
        // إزالته مؤقتا لإجبار iOS Safari على إعادة الحساب
        originalTag.remove();
      }

      // إنشاء وسم الـ viewport الخاص بـ Retro
      let retroTag = head.querySelector<HTMLMetaElement>(`meta[${RETRO_ATTR}]`);
      if (!retroTag) {
        retroTag = document.createElement('meta');
        retroTag.name = 'viewport';
        retroTag.setAttribute(RETRO_ATTR, 'true');
        head.appendChild(retroTag);
      }
      retroTag.content = `width=${desktopWidth}, user-scalable=yes, viewport-fit=cover`;
    } catch (e) {
      console.warn('[RetroViewport] Setup error:', e);
    }

    return () => {
      cleanup();
    };
  }, [desktopWidth, enabled, theme]);
}
