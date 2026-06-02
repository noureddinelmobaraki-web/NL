// src/hooks/useViewportSize.ts // VIEWPORT-AWARE
import { useState, useEffect } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isKeyboardOpen: boolean;
  isShortScreen: boolean;
  keyboardHeight: number;
  standalone: boolean;
}

export const useViewportSize = (): ViewportSize => {
  const [size, setSize] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isLandscape: false,
    isPortrait: true,
    isKeyboardOpen: false,
    isShortScreen: false,
    keyboardHeight: 0,
    standalone: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rAFId: number | null = null;
    let lastRun = 0;

    const handleUpdate = () => {
      const vv = window.visualViewport;
      const width = vv ? vv.width : window.innerWidth;
      const height = vv ? vv.height : window.innerHeight;
      const totalHeight = window.innerHeight;

      const isLandscape = width > height;
      const isPortrait = !isLandscape;
      const isShortScreen = height < 500;

      // Soft-keyboard detection: visualViewport height drops significantly compared to innerHeight
      const hasVV = !!vv;
      const heightDifference = totalHeight - height;
      const isKeyboardOpen = hasVV && height < totalHeight * 0.75 && heightDifference > 80;
      const keyboardHeight = isKeyboardOpen ? heightDifference : 0;

      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

      setSize({
        width,
        height,
        isLandscape,
        isPortrait,
        isKeyboardOpen,
        isShortScreen,
        keyboardHeight,
        standalone,
      });
    };

    const throttledUpdate = () => {
      const now = performance.now();
      if (now - lastRun >= 100) {
        lastRun = now;
        handleUpdate();
      } else {
        if (rAFId) cancelAnimationFrame(rAFId);
        rAFId = requestAnimationFrame(() => {
          lastRun = performance.now();
          handleUpdate();
        });
      }
    };

    // Initialize state
    handleUpdate();

    // Event listeners
    window.addEventListener('resize', throttledUpdate, { passive: true });
    window.addEventListener('orientationchange', throttledUpdate, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', throttledUpdate, { passive: true });
      window.visualViewport.addEventListener('scroll', throttledUpdate, { passive: true });
    }

    // Set standalone class on document body
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      document.body.classList.add('standalone-app');
    } else {
      document.body.classList.remove('standalone-app');
    }

    return () => {
      window.removeEventListener('resize', throttledUpdate);
      window.removeEventListener('orientationchange', throttledUpdate);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', throttledUpdate);
        window.visualViewport.removeEventListener('scroll', throttledUpdate);
      }
      if (rAFId) cancelAnimationFrame(rAFId);
    };
  }, []);

  return size;
};
