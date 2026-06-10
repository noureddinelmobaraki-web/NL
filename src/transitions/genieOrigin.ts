// src/transitions/genieOrigin.ts
// نقطة أصل الانتقال (genie): تُلتقط من آخر نقرة/لمسة، أو تُضبط يدوياً من عنصر.
export interface GenieOrigin { x: number; y: number }

let lastOrigin: GenieOrigin = { x: 0.5, y: 0.5 };

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

if (typeof window !== 'undefined') {
  const update = (clientX: number, clientY: number) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    lastOrigin = { x: clamp01(clientX / w), y: clamp01(clientY / h) };
  };
  window.addEventListener(
    'pointerdown',
    (e) => update(e.clientX, e.clientY),
    { capture: true, passive: true },
  );
  window.addEventListener(
    'click',
    (e) => { if (e.clientX || e.clientY) update(e.clientX, e.clientY); },
    { capture: true, passive: true },
  );
}

export function getGenieOrigin(): GenieOrigin {
  return lastOrigin;
}

export function setGenieOrigin(x: number, y: number): void {
  lastOrigin = { x: clamp01(x), y: clamp01(y) };
}

export function setGenieOriginFromElement(el: Element | null | undefined): void {
  if (!el || typeof window === 'undefined') return;
  const r = el.getBoundingClientRect();
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  setGenieOrigin((r.left + r.width / 2) / w, (r.top + r.height / 2) / h);
}

export function genieOriginToTransformOrigin(o: GenieOrigin = lastOrigin): string {
  return `${(o.x * 100).toFixed(2)}% ${(o.y * 100).toFixed(2)}%`;
}
