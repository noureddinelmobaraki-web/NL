import { useCallback, useMemo, useRef, useState } from 'react';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndices(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  const rng = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

const PAGE_SIZE = 100;

/**
 * ديك لانهائي: total = عدد الأغاني الأصلية.
 * resolve(virtualIndex) -> الفهرس الحقيقي داخل المصفوفة الأصلية.
 */
export function useEndlessDeck(total: number, baseSeed = 1) {
  const [count, setCount] = useState(() => Math.min(total, PAGE_SIZE));
  const blockCache = useRef<Map<number, number[]>>(new Map());

  const getBlock = useCallback((block: number): number[] => {
    if (total <= 0) return [];
    const cache = blockCache.current;
    let order = cache.get(block);
    if (!order) {
      order = shuffledIndices(total, (baseSeed * 2654435761 + block * 40503) >>> 0);
      cache.set(block, order);
      if (cache.size > 8) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
      }
    }
    return order;
  }, [total, baseSeed]);

  const resolve = useCallback((virtualIndex: number): number => {
    if (total <= 0) return 0;
    const block = Math.floor(virtualIndex / total);
    const pos = ((virtualIndex % total) + total) % total;
    return getBlock(block)[pos];
  }, [total, getBlock]);

  const ensureIndex = useCallback((visibleEndIndex: number) => {
    setCount((c) => {
      if (visibleEndIndex + (PAGE_SIZE / 2) > c) {
        return c + PAGE_SIZE;
      }
      return c;
    });
  }, []);

  // ترتيب دورة واحدة ابتداءً من virtualIndex (لبناء قائمة التشغيل)
  const cycleFrom = useCallback((virtualIndex: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < total; i++) out.push(resolve(virtualIndex + i));
    return out;
  }, [total, resolve]);

  return useMemo(() => ({ count, resolve, ensureIndex, cycleFrom }), [count, resolve, ensureIndex, cycleFrom]);
}
