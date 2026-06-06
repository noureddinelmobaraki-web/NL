import { useLayoutEffect } from 'react';

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
  useLayoutEffect(() => {
    if (!enabled) return;

    const head = document.head;
    const ORIGINAL_ATTR = 'data-original-viewport';
    const RETRO_ATTR = 'data-retro-viewport';

    // 1. اعثر على viewport tag الحالي واحفظ محتواه الأصلي.
    const originalTag = head.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]'
    );
    const originalContent =
      originalTag?.getAttribute('content') ??
      'width=device-width, initial-scale=1';

    // 2. احذف الـ tag الأصلي مؤقتاً (لإجبار إعادة الحساب على iOS Safari).
    if (originalTag) {
      originalTag.setAttribute(ORIGINAL_ATTR, originalContent);
      originalTag.remove();
    }

    // 3. أنشئ tag جديداً يُجبر سلوك سطح المكتب.
    //    user-scalable=yes يسمح للمستخدم بالـ pinch-zoom لرؤية التفاصيل.
    const retroTag = document.createElement('meta');
    retroTag.name = 'viewport';
    retroTag.setAttribute(RETRO_ATTR, 'true');
    retroTag.content = `width=${desktopWidth}, user-scalable=yes`;
    head.appendChild(retroTag);

    // 4. Cleanup: عند الخروج من صفحة Retro، استعد الحالة الأصلية بالضبط.
    return () => {
      const currentRetroTag = head.querySelector<HTMLMetaElement>(
        `meta[name="viewport"][${RETRO_ATTR}]`
      );
      currentRetroTag?.remove();

      // أعد إنشاء الـ tag الأصلي (بنفس content السابق تماماً).
      const restoredTag = document.createElement('meta');
      restoredTag.name = 'viewport';
      restoredTag.content = originalContent;
      head.appendChild(restoredTag);
    };
  }, [desktopWidth, enabled]);
}
