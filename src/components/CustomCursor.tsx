import { useEffect, useRef } from 'react';
import { prefersReducedMotion, isLowEndDevice } from '../utils/perf';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

export const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const points = useRef<{ x: number, y: number }[]>([]);
  const animRef = useRef<number>(0);
  const moving = useRef(false);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const lowPerformance = isLowEndDevice() || prefersReducedMotion();
    if (isTouch || lowPerformance) return;

    if (resolvedTheme === 'light') {
      document.body.style.cursor = 'auto';
    } else if (resolvedTheme !== 'dark') {
      document.body.style.cursor = 'none';
    } else {
      document.body.style.cursor = 'auto';
    }

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      moving.current = true;
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate3d(${e.clientX - (resolvedTheme === 'dark' ? 0.5 : 4)}px, ${e.clientY - (resolvedTheme === 'dark' ? 10 : 4)}px, 0)`;
      }
    };

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);

      // Trail logic for dark mode
      if (resolvedTheme === 'dark' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Add current position to points
          points.current.unshift({ ...pos.current });
          
          // Limit points based on speed (more points if moving faster)
          const lastPoint = points.current[1] || pos.current;
          const dist = Math.hypot(pos.current.x - lastPoint.x, pos.current.y - lastPoint.y);
          const maxPoints = Math.min(50, 15 + dist * 2); // Dynamic length
          
          if (points.current.length > maxPoints) {
            points.current.pop();
          }

          if (points.current.length > 1) {
            ctx.beginPath();
            ctx.moveTo(points.current[0].x, points.current[0].y);
            
            for (let i = 1; i < points.current.length; i++) {
              const p = points.current[i];
              ctx.lineTo(p.x, p.y);
            }

            // Style
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2;
            
            // Better to stroke with declining alpha
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#B8FF3F';
            ctx.strokeStyle = '#B8FF3F';

            // Multi-pass stroke for fading effect (alternative)
            // Or just use global alpha if doing one stroke
            ctx.globalAlpha = 0.8;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
          }
        }
      }

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
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(animRef.current);
    };
  }, [resolvedTheme]);

  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const lowPerformance = typeof window !== 'undefined' && (isLowEndDevice() || prefersReducedMotion());
  if (isTouch || lowPerformance || resolvedTheme === 'light') return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 999997,
        }}
      />
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: resolvedTheme === 'dark' ? 1 : 8, 
        height: resolvedTheme === 'dark' ? 20 : 8,
        background: resolvedTheme === 'dark' ? '#FFFFFF' : 'var(--text-primary)',
        borderRadius: resolvedTheme === 'dark' ? '0' : '50%',
        pointerEvents: 'none',
        zIndex: 999999,
        willChange: 'transform',
      }} />
      <div ref={ringRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: 32, height: 32,
        border: '1.5px solid var(--text-secondary)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 999998,
        willChange: 'transform',
        transition: 'width 200ms, height 200ms, border-color 200ms, margin 200ms',
        opacity: resolvedTheme === 'dark' ? 0 : 1,
      }} />
    </>
  );
};
