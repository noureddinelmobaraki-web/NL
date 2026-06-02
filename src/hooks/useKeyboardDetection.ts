import { useEffect } from 'react';
import { useDeviceType } from './useDeviceType';

export const useKeyboardDetection = () => {
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !isMobile) return;

    const handler = () => {
      // Visual viewport height is significantly smaller than window inner height when keyboard is up
      const kbOpen = window.innerHeight - vv.height > 150;
      document.body.classList.toggle('keyboard-open', kbOpen);
    };

    vv.addEventListener('resize', handler, { passive: true });
    return () => vv.removeEventListener('resize', handler);
  }, [isMobile]);
};
