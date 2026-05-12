import { useEffect, useRef } from 'react';
import { prefersReducedMotion, isLowEndDevice } from '../utils/perf';

export const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const moving = useRef(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const lowPerformance = isLowEndDevice() || prefersReducedMotion();
    if (isTouch || lowPerformance) return;

    document.body.style.cursor = 'none';

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      moving.current = true;
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate3d(${e.clientX - 4}px, ${e.clientY - 4}px, 0)`;
      }
    };

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      if (!moving.current) return;

      const dx = pos.current.x - ringPos.current.x;
      const dy = pos.current.y - ringPos.current.y;

      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        moving.current = false;
        return;
      }

      ringPos.current.x += dx * 0.25;
      ringPos.current.y += dy * 0.25;

      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate3d(${ringPos.current.x - 16}px, ${ringPos.current.y - 16}px, 0)`;
      }
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, select')) {
        ringRef.current?.classList.add('cursor-hover');
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, select')) {
        ringRef.current?.classList.remove('cursor-hover');
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);

    animate();

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const lowPerformance = typeof window !== 'undefined' && (isLowEndDevice() || prefersReducedMotion());
  if (isTouch || lowPerformance) return null;

  return (
    <>
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: 8, height: 8,
        background: 'white',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 999999,
        willChange: 'transform',
      }} />
      <div ref={ringRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: 32, height: 32,
        border: '1.5px solid rgba(255,255,255,0.6)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 999998,
        willChange: 'transform',
        transition: 'width 200ms, height 200ms, border-color 200ms, margin 200ms',
      }} />
    </>
  );
};
