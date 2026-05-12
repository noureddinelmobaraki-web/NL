import { useEffect, useRef } from 'react';

export function useParallax(intensity = 20) {
  const ref = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateParallax = () => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }
      requestRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth - 0.5) * intensity,
        y: (e.clientY / window.innerHeight - 0.5) * intensity,
      };

      if (requestRef.current === null) {
        requestRef.current = requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [intensity]);

  return ref;
}
