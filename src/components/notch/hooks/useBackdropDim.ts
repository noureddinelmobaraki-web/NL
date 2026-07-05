import { useEffect, useRef } from 'react';

/**
 * هوك خفيف لتعتيم الخلفية عند فتح نافذة النوتش.
 * - يُنشئ طبقة ثابتة (fixed) مرّة واحدة على مستوى <body> خارج شجرة React،
 *   فلا يسبّب أي إعادة رندر.
 * - لا بلور ولا تأثيرات ثقيلة — مجرّد خفض إضاءة (طبقة داكنة شفّافة) بانتقال
 *   opacity تدريجي سريع مع الفتح/القفل.
 * - z-index أقل من النوتش (2147483000) وأعلى من الصفحات، و pointer-events: none
 *   حتى لا يحجب النقر (الإغلاق الخارجي يتكفّل بالنقر خارج النافذة).
 */
export function useBackdropDim(
  active: boolean,
  opts?: { opacity?: number; ms?: number; z?: number; color?: string },
): void {
  const opacity = opts?.opacity ?? 0.42;
  const ms = opts?.ms ?? 200;
  const z = opts?.z ?? 2147482990;
  const color = opts?.color ?? '#070b0f';
  const elRef = useRef<HTMLDivElement | null>(null);

  // إنشاء الطبقة مرّة واحدة.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.setAttribute('data-notch-dim', '');
    el.setAttribute('aria-hidden', 'true');
    const s = el.style;
    s.position = 'fixed';
    s.inset = '0';
    s.background = color;
    s.opacity = '0';
    s.pointerEvents = 'none';
    s.zIndex = String(z);
    s.willChange = 'opacity';
    s.transition = `opacity ${ms}ms ease`;
    document.body.appendChild(el);
    elRef.current = el;
    return () => {
      el.remove();
      elRef.current = null;
    };
  }, [color, z, ms]);

  // تبديل الإضاءة تدريجيًا حسب الحالة.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = active ? String(opacity) : '0';
  }, [active, opacity, ms]);
}
