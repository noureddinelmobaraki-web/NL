// src/hooks/useStructuredData.ts
import { useEffect } from 'react';

/**
 * Hook لتحميل JSON-LD ديناميكياً وحقنه في <head>.
 * مع AbortController للـ cleanup الصحيح + cleanup للـ script عند unmount.
 */
export function useStructuredData(jsonPath: string, scriptId: string) {
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const controller = new AbortController();

    fetch(`${normalizedBase}${jsonPath}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`JSON-LD ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        document.getElementById(scriptId)?.remove();

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = scriptId;
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (import.meta.env.DEV) {
          console.warn(`[useStructuredData:${scriptId}] failed:`, err);
        }
      });

    return () => {
      controller.abort();
      document.getElementById(scriptId)?.remove();
    };
  }, [jsonPath, scriptId]);
}
