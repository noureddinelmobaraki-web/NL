import { useEffect, useRef } from 'react';

/**
 * ScrollProgress component that updates a progress bar using a ResizeObserver
 * and direct DOM manipulation via CSS variables and transforms for maximum performance.
 */
export const ScrollProgress = () => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // docHeight = total scrollable area minus visible area
    let docHeight = document.documentElement.scrollHeight - window.innerHeight;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
      // Using transform: scaleX is cheaper than updating width as it avoids reflow
      bar.style.transform = `scaleX(${progress})`;
    };

    // ResizeObserver picks up internal layout changes (e.g. dynamic content loading)
    const resizeObserver = new ResizeObserver(() => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
      updateProgress();
    });

    resizeObserver.observe(document.documentElement);

    // Window resize as fallback or for cross-browser reliability
    const handleResize = () => {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
      updateProgress();
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Initial update
    updateProgress();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        width: '100%',
        background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.4))',
        zIndex: 99999,
        pointerEvents: 'none',
        transformOrigin: 'left',
        transform: 'scaleX(0)', // Default state
        willChange: 'transform',
      }}
    />
  );
};
