import { useState, useEffect, useRef } from 'react';

export function useAutoHideUI(active: boolean, delay = 3000): boolean {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }

    const reset = () => {
      setVisible(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setVisible(false), delay);
    };

    reset();
    window.addEventListener('touchstart', reset, { passive: true });
    window.addEventListener('mousemove', reset, { passive: true });

    return () => {
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('mousemove', reset);
      window.clearTimeout(timerRef.current);
    };
  }, [active, delay]);

  return visible;
}
