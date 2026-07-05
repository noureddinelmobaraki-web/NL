import { useCallback, useState } from 'react';
import type { SwitcherBranch } from '../notch.types';

/**
 * حالة النافذة: فتح/غلق + الفرع النشط.
 * القاعدة الجديدة: عند فتح النافذة لا يكون أي فرع مفتوحًا (branch === null)،
 * فيظهر زران فقط: "Modes" و "Go to". الضغط على زر يفتح فرعه (ويغلق الآخر)،
 * والضغط على فرع مفتوح يغلقه. تبديل الفرع لا يغلق النافذة أبدًا (إصلاح الأكورديون).
 */
export function useSwitcherState() {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<SwitcherBranch | null>(null);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => { setOpen(false); setBranch(null); }, []);
  const openPanel = useCallback(() => setOpen(true), []);
  const selectBranch = useCallback((b: SwitcherBranch) => {
    setBranch((cur) => (cur === b ? null : b));
  }, []);
  return { open, branch, toggle, close, openPanel, selectBranch };
}
