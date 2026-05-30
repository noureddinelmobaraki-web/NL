import { useEffect, useRef, memo } from 'react';

export const MoodParticles = memo(() => {
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesAnimRef = useRef<number>(0);

  // ── جزيئات عائمة مثل antigravity.google
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── إنشاء الجزيئات
    const PARTICLE_COUNT = window.innerWidth < 768 ? 40 : 80;
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      rotation: number;
      rotSpeed: number;
      shape: 'dot' | 'dash';
      color: string;
    }

    const COLORS = [
      'rgba(120, 120, 120,', // رمادي
      'rgba(180, 180, 200,', // رمادي مزرق
      'rgba(100, 100, 180,', // بنفسجي خفيف
      'rgba(160, 160, 200,', // بنفسجي فاتح
      'rgba(100, 160, 100,', // أخضر خفيف
      'rgba(200, 120, 120,', // وردي خفيف
    ];

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.1, // ميل خفيف للأعلى
      size: Math.random() * 3 + 1.5,
      opacity: Math.random() * 0.35 + 0.1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      shape: Math.random() > 0.3 ? 'dash' : 'dot',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // حرك الجزيئة
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // إعادة الجزيئة للشاشة إذا خرجت
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.shape === 'dash') {
          // خط قصير مائل
          ctx.strokeStyle = `${p.color}1)`;
          ctx.lineWidth = p.size * 0.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-p.size * 2, 0);
          ctx.lineTo(p.size * 2, 0);
          ctx.stroke();
        } else {
          // نقطة دائرية
          ctx.fillStyle = `${p.color}1)`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      particlesAnimRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(particlesAnimRef.current);
    };
  }, []);

  return (
    <canvas
      ref={particlesCanvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
});
