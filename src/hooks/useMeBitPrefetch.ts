import { useEffect } from 'react';

/**
 * Prefetch للصور المجاورة فالمعرض (الجاية + السابقة).
 * كيحملهم فالخلفية عبر new Image() باش يدخلو للـ cache قبل ما يوصللهم المستخدم.
 */
export function useMeBitPrefetch(urls: readonly string[], currentIndex: number): void {
  useEffect(() => {
    if (!urls.length) return;
    const targets = [currentIndex + 1, currentIndex - 1]
      .filter((i) => i >= 0 && i < urls.length)
      .map((i) => urls[i]);

    const imgs: HTMLImageElement[] = [];
    for (const url of targets) {
      if (!url) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      imgs.push(img);
    }
    return () => {
      // قطع التحميل إذا تبدّل index بسرعة
      for (const img of imgs) img.src = '';
    };
  }, [urls, currentIndex]);
}
