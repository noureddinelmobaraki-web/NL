import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOrientationListener } from '../../hooks/useOrientationListener';

export function triggerVibration(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(10);
    } catch {}
  }
}

export interface UseDrawingsFullscreenGesturesOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  videosLength: number;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
}

export function useDrawingsFullscreenGestures({
  scrollContainerRef,
  activeIndex,
  videosLength,
  onIndexChange,
  onClose,
}: UseDrawingsFullscreenGesturesOptions) {
  const initialActiveIndexRef = useRef(activeIndex);
  const [showProgressCounter, setShowProgressCounter] = useState(true);
  const autoHideTimeoutRef = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  useOrientationListener(
    useCallback(() => {
      if (scrollContainerRef.current) {
        const children = scrollContainerRef.current.querySelectorAll('.video-card-wrapper');
        const child = children[activeIndex] as HTMLElement;
        child?.scrollIntoView({ behavior: 'instant' });
      }
    }, [activeIndex, scrollContainerRef])
  );

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetAutoHideTimer = useCallback(() => {
    setShowProgressCounter(true);
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    autoHideTimeoutRef.current = window.setTimeout(() => {
      setShowProgressCounter(false);
    }, 2000);
  }, []);

  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
  }, [resetAutoHideTimer]);

  const dismissSwipeHint = useCallback(() => {
    setShowSwipeHint((prev) => {
      if (prev) {
        localStorage.setItem('drawings_scroll_guided', 'true');
        return false;
      }
      return prev;
    });
  }, []);

  const onUserInteract = useCallback(() => {
    resetAutoHideTimer();
    dismissSwipeHint();
  }, [resetAutoHideTimer, dismissSwipeHint]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      onUserInteract();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [onUserInteract, scrollContainerRef]);

  useEffect(() => {
    const handleTouch = () => {
      onUserInteract();
    };
    window.addEventListener('touchstart', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [onUserInteract]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const children = container.querySelectorAll('.video-card-wrapper');
    const initialIndex = initialActiveIndexRef.current;
    if (children[initialIndex]) {
      children[initialIndex].scrollIntoView({ behavior: 'instant' });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx) && onIndexChange) {
              onIndexChange(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [videosLength, onIndexChange, scrollContainerRef]);

  const smoothScrollTo = useCallback(
    (targetIdx: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      triggerVibration();

      if (onIndexChange) {
        onIndexChange(targetIdx);
      }

      const currentSnap = container.style.scrollSnapType;
      container.style.scrollSnapType = 'none';

      const targetTop = targetIdx * container.clientHeight;
      container.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });

      setTimeout(() => {
        if (container) {
          container.style.scrollSnapType = currentSnap;
        }
      }, 450);
    },
    [onIndexChange, scrollContainerRef]
  );

  useEffect(() => {
    const guided = localStorage.getItem('drawings_scroll_guided');
    let bounceTimer: number;
    let hideTimer: number;
    if (!guided) {
      setShowSwipeHint(true);

      bounceTimer = window.setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const originalSnap = container.style.scrollSnapType;
          container.style.scrollSnapType = 'none';

          container.scrollTo({ top: 110, behavior: 'smooth' });

          setTimeout(() => {
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });

              setTimeout(() => {
                if (container) {
                  container.style.scrollSnapType = originalSnap;
                }
              }, 700);
            }
          }, 950);
        }
      }, 1000);

      hideTimer = window.setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('drawings_scroll_guided', 'true');
      }, 4000);
    }
    return () => {
      if (bounceTimer) clearTimeout(bounceTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [scrollContainerRef]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartTimeRef.current = Date.now();
      dismissSwipeHint();
    },
    [dismissSwipeHint]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      dismissSwipeHint();
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaY = touchStartYRef.current - touchEndY;
      const deltaX = touchStartXRef.current - touchEndX;
      const deltaTime = Date.now() - touchStartTimeRef.current;

      if (activeIndex === 0 && deltaY < -80 && Math.abs(deltaX) < 50) {
        onClose();
        return;
      }

      if (Math.abs(deltaY) > 25 && Math.abs(deltaX) < 50 && deltaTime < 400) {
        const nextIdx =
          deltaY > 0
            ? Math.min(activeIndex + 1, videosLength - 1)
            : Math.max(activeIndex - 1, 0);

        if (nextIdx !== activeIndex) {
          smoothScrollTo(nextIdx);
        }
      }
    },
    [activeIndex, dismissSwipeHint, onClose, smoothScrollTo, videosLength]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(activeIndex + 1, videosLength - 1);
        const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
        const child = children?.[nextIdx] as HTMLElement;
        child?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(activeIndex - 1, 0);
        const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
        const child = children?.[prevIdx] as HTMLElement;
        child?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, scrollContainerRef, videosLength]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, videosLength - 1));
      const children = scrollContainerRef.current?.querySelectorAll('.video-card-wrapper');
      const child = children?.[clamped] as HTMLElement | undefined;
      child?.scrollIntoView({ behavior: 'smooth' });
    },
    [scrollContainerRef, videosLength]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let locked = false;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      if (locked) return;
      locked = true;
      goTo(activeIndex + (e.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => {
        locked = false;
      }, 550);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [activeIndex, goTo, scrollContainerRef]);

  return {
    viewportHeight,
    showProgressCounter,
    showSwipeHint,
    handleTouchStart,
    handleTouchEnd,
    goTo,
  };
}
