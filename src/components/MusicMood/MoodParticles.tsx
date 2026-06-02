// src/components/MusicMood/MoodParticles.tsx // AUDIO-REACTIVE-PARTICLES

import { useEffect, useRef, useState, memo, RefObject, useCallback } from 'react';

// ── CUSTOM LIGHTWEIGHT WAVE NOISE FUNCTION (PERLIN-LIKE CONTINUOUS FLOW FIELD)
const noise = (x: number, y: number, z: number): number => {
  const n1 = Math.sin(x * 1.5 + y * 0.5 + z * 2.1);
  const n2 = Math.cos(x * 0.5 - y * 1.2 + z * 0.8);
  const n3 = Math.sin(x * 0.25 + y * 1.8 - z * 0.5);
  return n1 * 0.4 + n2 * 0.4 + n3 * 0.2; // returns continuous value in [-1, 1]
};

const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  return cores < 4 || isReduced;
};

// Minimalistic neutral dreamy color palette matching antigravity aesthetic
const PALETTE = [
  { r:  82, g: 113, b: 196 },  // deep ocean blue
  { r: 134, g: 168, b: 231 },  // wave crest
  { r: 196, g: 178, b: 234 },  // soft amethyst
  { r: 230, g: 215, b: 240 },  // foam white
  { r: 255, g: 244, b: 200 },  // moonlight gold (5% of Layer C only)
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  r: number;
  g: number;
  b: number;
  layer: 'A' | 'B' | 'C';
  glow?: boolean;
}

interface RippleRing {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  startTime: number;
}

interface MoodParticlesProps {
  glowIntensity?: number;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export const MoodParticles = memo(({ glowIntensity = 0, audioRef }: MoodParticlesProps) => {
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesAnimRef = useRef<number>(0);
  const prevBassRef = useRef<number>(0);
  const cursorRef = useRef({ x: -1000, y: -1000, active: false, lastTrigger: 0 });
  const [rippleRings, setRippleRings] = useState<RippleRing[]>([]);
  
  // Smoothing refs
  const smoothBassRef = useRef(0);
  const smoothMidRef = useRef(0);
  const smoothTrebleRef = useRef(0);

  const triggerRipple = useCallback((x?: number, y?: number) => {
    const rx = x ?? window.innerWidth / 2;
    const ry = y ?? window.innerHeight / 2;
    setRippleRings(prev => [...prev.slice(-10), { 
      x: rx, 
      y: ry, 
      radius: 0, 
      opacity: 0.6, 
      startTime: performance.now() 
    }]);
  }, []);

  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const W = window.innerWidth;
    const isMobile = W < 768;
    const isTablet = W >= 768 && W < 1024;
    const lowEnd = isLowEndDevice();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.active = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        cursorRef.current.x = tx;
        cursorRef.current.y = ty;
        cursorRef.current.active = true;

        const now = Date.now();
        if (now - cursorRef.current.lastTrigger > 80) {
          triggerRipple(tx, ty);
          cursorRef.current.lastTrigger = now;
        }
      }
    };
    const onLeave = () => { cursorRef.current.active = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onLeave);

    let PARTICLE_COUNT = isMobile ? 110 : (isTablet ? 180 : 280);
    if (lowEnd) PARTICLE_COUNT = 60;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const ratio = i / PARTICLE_COUNT;
      let layer: 'A' | 'B' | 'C' = 'B';
      if (ratio < 0.4) layer = 'A';
      else if (ratio < 0.9) layer = 'B';
      else layer = 'C';

      let size = 1;
      let opacity = 0.5;
      let glow = false;

      if (layer === 'A') {
        size = Math.random() * 0.7 + 0.8;
        opacity = Math.random() * 0.1 + 0.15;
      } else if (layer === 'B') {
        size = Math.random() * 1.5 + 1.5;
        opacity = Math.random() * 0.3 + 0.4;
      } else {
        size = Math.random() * 1.5 + 2.5;
        opacity = Math.random() * 0.3 + 0.7;
        glow = true;
      }

      let color = PALETTE[Math.floor(Math.random() * 4)];
      if (layer === 'C' && Math.random() < 0.05) color = PALETTE[4]; // moonlight gold

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size,
        baseOpacity: opacity,
        opacity,
        r: color.r,
        g: color.g,
        b: color.b,
        layer,
        glow,
      };
    });

    let frameCount = 0;

    const draw = (timestamp: number) => {
      if (document.hidden) {
        particlesAnimRef.current = requestAnimationFrame(draw);
        return;
      }
      
      frameCount++;

      const canvasW = window.innerWidth;
      const canvasH = window.innerHeight;
      ctx.clearRect(0, 0, canvasW, canvasH);

      // AUDIO PROCESSING
      const audio = audioRef?.current;
      const analyser = audio ? (audio as any).__analyser : null;
      let rawBass = 0, rawMid = 0, rawTreble = 0;

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        
        const avg = (arr: Uint8Array, start: number, end: number) => {
          if (start >= arr.length) return 0;
          const subset = arr.slice(start, Math.min(end, arr.length));
          return subset.reduce((s, v) => s + v, 0) / (subset.length || 1) / 255;
        };

        rawBass = avg(data, 0, 6);
        rawMid = avg(data, 7, 40);
        rawTreble = avg(data, 41, 120);
      } else {
        rawBass = glowIntensity;
        rawMid = glowIntensity * 0.7;
        rawTreble = glowIntensity * 0.4;
      }

      smoothBassRef.current = smoothBassRef.current * 0.7 + rawBass * 0.3;
      smoothMidRef.current = smoothMidRef.current * 0.7 + rawMid * 0.3;
      smoothTrebleRef.current = smoothTrebleRef.current * 0.7 + rawTreble * 0.3;

      const sBass = smoothBassRef.current;
      const sMid = smoothMidRef.current;
      const sTreble = smoothTrebleRef.current;

      // BEAT DETECTION
      if (sBass > prevBassRef.current * 1.25 && sBass > 0.55) {
        triggerRipple();
        if (sBass > 0.8) setTimeout(() => triggerRipple(), 80);
      }
      prevBassRef.current = sBass;

      // RURPLE RINGS UPDATE
      setRippleRings(prev => prev.filter(r => {
        const elapsed = timestamp - r.startTime;
        if (elapsed > 800) return false;
        r.radius = (elapsed / 800) * 200;
        r.opacity = (1 - elapsed / 800) * 0.6;
        return true;
      }));

      // LAYER A: Skip every other frame on lowEnd
      const skipLayerA = lowEnd && (frameCount % 2 === 0);

      // PARTICLE UPDATES
      particles.forEach(p => {
        if (p.layer === 'A' && skipLayerA) return;

        // Flow field
        const angle = noise(p.x * 0.005, p.y * 0.005, timestamp * 0.0003) * Math.PI * 4;
        p.vx = p.vx * 0.92 + Math.cos(angle) * 0.08;
        p.vy = p.vy * 0.92 + Math.sin(angle) * 0.08;

        // Layer reactions
        if (p.layer === 'B') {
          const dx = p.x - canvasW / 2, dy = p.y - canvasH / 2;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx += (dx / dist) * sMid * 0.4;
          p.vy += (dy / dist) * sMid * 0.4;
        }

        if (p.layer === 'C') {
          const dx = p.x - canvasW / 2, dy = p.y - canvasH / 2;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx += (dx / dist) * sBass * 0.8;
          p.vy += (dy / dist) * sBass * 0.8;
          p.opacity = p.baseOpacity * (0.8 + sTreble * 0.4);
        }

        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap
        if (p.x < -50) p.x = canvasW + 50;
        if (p.x > canvasW + 50) p.x = -50;
        if (p.y < -50) p.y = canvasH + 50;
        if (p.y > canvasH + 50) p.y = -50;
      });

      // DRAW ORDER
      // 1. Layer A
      ctx.globalCompositeOperation = 'source-over';
      particles.forEach(p => {
        if (p.layer !== 'A') return;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      // 2. Connecting Web (Layers A+B)
      if (!lowEnd) {
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          if (p1.layer === 'C') continue;
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            if (p2.layer === 'C') continue;
            const dx = p1.x - p2.x, dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 2500) {
              const d = Math.sqrt(distSq);
              ctx.strokeStyle = `rgba(${PALETTE[0].r},${PALETTE[0].g},${PALETTE[0].b},${(1 - d / 50) * 0.08})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // 3. Layer B
      particles.forEach(p => {
        if (p.layer !== 'B') return;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      // 4. Layer C (Glow)
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach(p => {
        if (p.layer !== 'C') return;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        g.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${p.opacity})`);
        g.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2); ctx.fill();
      });

      // 5. Ripple Rings
      ctx.globalCompositeOperation = 'source-over';
      rippleRings.forEach(r => {
        ctx.strokeStyle = `rgba(255,255,255,${r.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
      });

      particlesAnimRef.current = requestAnimationFrame(draw);
    };

    particlesAnimRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onLeave);
      cancelAnimationFrame(particlesAnimRef.current);
    };
  }, [glowIntensity, audioRef, triggerRipple]);

  return (
    <canvas
      ref={particlesCanvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
});

