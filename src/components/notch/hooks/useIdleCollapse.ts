import { useCallback, useEffect, useRef } from 'react';

export function useIdleCollapse(opts: { open: boolean; isDesktop: boolean; onCollapse: () => void }) {
  const { open, isDesktop, onCollapse } = opts;
  const timer = useRef<number | null>(null);
  const clear = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
  }, []);
  const schedule = useCallback(() => {
    clear();
    timer.current = window.setTimeout(onCollapse, isDesktop ? 4000 : 9000);
  }, [clear, isDesktop, onCollapse]);
  useEffect(() => () => clear(), [clear]);
  useEffect(() => { if (!open) clear(); }, [open, clear]);
  return { schedule, keepAlive: clear };
}
