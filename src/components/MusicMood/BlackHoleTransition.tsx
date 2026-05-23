// src/components/MusicMood/BlackHoleTransition.tsx

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface BlackHoleTransitionProps {
  onComplete: () => void; // يُستدعى بعد انتهاء الـ 10 ثوانٍ
  onNearComplete?: () => void; // يُستدعى عند 88% — لبدء ظهور الشاشة البيضاء مبكراً
}

// ══════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════
export const BlackHoleTransition = ({ onComplete, onNearComplete }: BlackHoleTransitionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const nearCompleteFiredRef = useRef(false);

  // ──────────────────────────────
  // 1. تجميد الـ scroll و interaction أثناء الانتقال
  // ──────────────────────────────
  useEffect(() => {
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // أيضاً أوقف pointer events على كل العناصر الأخرى
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
      document.body.style.pointerEvents = '';
      document.body.style.userSelect = '';
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ──────────────────────────────
  // 2. لقطة snapshot للصفحة الحالية
  //    نستخدم html2canvas لأخذ صورة حقيقية للصفحة قبل ابتلاعها
  //    ثم نرسمها في canvas ونشوّهها
  // ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // ──────────────────────────────
    // المتغيرات الزمنية
    // ──────────────────────────────
    const TOTAL_DURATION = 10000; // 10 ثوانٍ كاملة

    // cx, cy = مركز الثقب الأسود (وسط الشاشة)
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // مصفوفة جزيئات الـ glitch
    const glitchParticles: {
      x: number; y: number; w: number; h: number;
      vx: number; vy: number; life: number; maxLife: number;
      color: string; rotation: number; rotSpeed: number;
    }[] = [];

    // ──────────────────────────────
    // دالة spawn للـ glitch particles
    // ──────────────────────────────
    const spawnGlitch = (intensity: number) => {
      const count = Math.floor(intensity * 8);
      for (let i = 0; i < count; i++) {
        glitchParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          w: Math.random() * 120 + 20,
          h: Math.random() * 8 + 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 1,
          maxLife: 0.3 + Math.random() * 0.5,
          color: ['#B8FF3F', '#FF00CC', '#00FFFF', '#FF2D78', '#FFFFFF'][
            Math.floor(Math.random() * 5)
          ],
          rotation: (Math.random() - 0.5) * 0.4,
          rotSpeed: (Math.random() - 0.5) * 0.05,
        });
      }
    };

    // ──────────────────────────────
    // حلقة الرسم الرئيسية
    // ──────────────────────────────
    const draw = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed  = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / TOTAL_DURATION, 1);

      // ── امسح الـ canvas ليكون شفافاً تماماً
      // الموقع يُرى من تحته لأن الـ canvas شفاف
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── تأثير تشويه الألوان على الصفحة (Hue shift)
      // نفعله عبر overlay شفاف بلون متغير
      if (progress > 0.05) {
        const distortIntensity = Math.min((progress - 0.05) / 0.6, 1);
        // overlay بنفسجي شفاف يزداد مع الوقت
        ctx.fillStyle = `rgba(60, 0, 80, ${distortIntensity * 0.35})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // ── Glitch lines — تؤثر على ما يُرى من الموقع
      if (progress > 0.1) {
        const glitchIntensity = Math.pow((progress - 0.1) / 0.9, 2);

        // spawn glitch
        if (Math.random() < glitchIntensity * 0.5) spawnGlitch(glitchIntensity);

        // ── Glitch scan lines — تُظهر الموقع بشكل مشوّه
        const numLines = Math.floor(glitchIntensity * 6);
        for (let i = 0; i < numLines; i++) {
          const sy = Math.random() * canvas.height;
          const sh = Math.random() * 20 + 3;
          const dx = (Math.random() - 0.5) * 60 * glitchIntensity;
          try {
            // انسخ شريط من الـ canvas (الذي يحتوي الأوفرلاي) وأزحه
            const imageData = ctx.getImageData(0, sy, canvas.width, sh);
            ctx.putImageData(imageData, dx, sy);
          } catch { /* تجاهل */ }
        }

        // ── رسم glitch particles الملوّنة
        for (let i = glitchParticles.length - 1; i >= 0; i--) {
          const p = glitchParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.016 / p.maxLife;
          p.rotation += p.rotSpeed;
          if (p.life <= 0) { glitchParticles.splice(i, 1); continue; }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life) * glitchIntensity * 0.8;
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      // ── الثقب الأسود — يكبر من المركز
      const holeRadius = easeInExpo(progress) * Math.hypot(cx, cy) * 1.6;

      if (holeRadius > 0) {
        // ── هالة خارجية (تُظلم المنطقة حول الثقب)
        const outerGlow = ctx.createRadialGradient(
          cx, cy, holeRadius * 0.7,
          cx, cy, holeRadius * 1.6
        );
        outerGlow.addColorStop(0, 'rgba(0,0,0,0.95)');
        outerGlow.addColorStop(0.4, 'rgba(40,0,60,0.7)');
        outerGlow.addColorStop(0.8, 'rgba(20,0,30,0.3)');
        outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, holeRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // ── جسم الثقب الأسود (المركز أبيض → أسود للخارج)
        const holeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, holeRadius);
        holeGrad.addColorStop(0,    'rgba(255,255,255,1)');  // مركز أبيض نقي
        holeGrad.addColorStop(0.12, 'rgba(255,255,255,0.95)');
        holeGrad.addColorStop(0.3,  'rgba(200,180,255,0.7)');
        holeGrad.addColorStop(0.55, 'rgba(10,0,20,1)');
        holeGrad.addColorStop(0.8,  'rgba(0,0,0,1)');
        holeGrad.addColorStop(1,    'rgba(0,0,0,1)');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
        ctx.fill();

        // ── حلقة الـ accretion disk (تدور حول الثقب)
        if (holeRadius > 15) {
          ctx.save();
          ctx.globalAlpha = Math.min(progress * 4, 0.8);

          // الحلقة الأولى — خضراء
          ctx.strokeStyle = 'rgba(184,255,63,0.7)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 10]);
          ctx.lineDashOffset = -progress * 300;
          ctx.beginPath();
          ctx.ellipse(cx, cy, holeRadius * 1.15, holeRadius * 0.25, progress * Math.PI * 1.2, 0, Math.PI * 2);
          ctx.stroke();

          // الحلقة الثانية — وردية
          ctx.strokeStyle = 'rgba(255,80,200,0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 12]);
          ctx.lineDashOffset = progress * 200;
          ctx.beginPath();
          ctx.ellipse(cx, cy, holeRadius * 1.28, holeRadius * 0.18, -progress * Math.PI * 0.8, 0, Math.PI * 2);
          ctx.stroke();

          // الحلقة الثالثة — بيضاء خفية
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 16]);
          ctx.lineDashOffset = progress * 100;
          ctx.beginPath();
          ctx.ellipse(cx, cy, holeRadius * 0.95, holeRadius * 0.35, progress * Math.PI * 0.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        }
      }

      // ── إطلاق onNearComplete عند 88% لبدء ظهور الشاشة البيضاء مبكراً
      if (progress >= 0.88 && !nearCompleteFiredRef.current) {
        nearCompleteFiredRef.current = true;
        onNearComplete?.();
      }

      // ── طغيان أبيض في النهاية
      if (progress > 0.88) {
        const whiteProgress = (progress - 0.88) / 0.12;
        ctx.fillStyle = `rgba(255,255,255,${easeInCubic(whiteProgress)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // ── انتهاء
      if (progress >= 1) {
        cancelAnimationFrame(animFrameRef.current);
        onComplete();
        return;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [onComplete, onNearComplete]);

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100dvw',
        height: '100dvh',
        zIndex: 2147483647,
        pointerEvents: 'all',
        display: 'block',
      }}
    />,
    document.body
  );
};

// ══════════════════════════════════
// دوال مساعدة للـ easing
// ══════════════════════════════════
const easeInExpo = (t: number) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);

const easeInCubic = (t: number) => t * t * t;
