import { useEffect } from 'react';

/**
 * إغلاق خارجي محصّن:
 * 1) enabled فقط (مثلاً الهاتف والنافذة مفتوحة).
 * 2) نستخدم composedPath() الملتقَط لحظة الحدث — يبقى صحيحًا حتى لو انفصلت العقدة
 *    لاحقًا بفعل AnimatePresence (سبب انغلاق الأكورديون).
 * 3) نتجاهل أي هدف منفصل (isConnected === false) احتياطًا مزدوجًا.
 */
export function useOutsideClose(opts: {
  enabled: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const { enabled, rootRef, onClose } = opts;
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const path = (e.composedPath?.() ?? []) as EventTarget[];
      if (path.length && path.includes(root)) return;      // ✅ نُقِر داخل الجذر
      const t = e.target as Node | null;
      if (t && !(t as ChildNode).isConnected) return;      // ✅ عقدة منفصلة = تجاهل
      if (t && root.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [enabled, rootRef, onClose]);
}
