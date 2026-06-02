// src/components/MusicMood/MoodParticles.tsx
// AUDIO-REACTIVE OCEANIC WATER SURFACE v2026.2 — Production
// شبكة ماء هادئة + موجات Bass متسلسلة + تموج أسود في القمم + CORS fallback

import { useEffect, useRef, memo, RefObject, useCallback } from 'react';

const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const isReduced = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  return cores < 4 || isReduced;
};

// لوحة ألوان ماء بحري/فضائي حالم
const PALETTE = [
  { r:  82, g: 113, b: 196 },  // deep ocean
  { r: 134, g: 168, b: 231 },  // wave crest
  { r: 196, g: 178, b: 234 },  // soft amethyst
  { r: 230, g: 215, b: 240 },  // foam
  { r: 255, g: 244, b: 200 },  // moonlight (5% of C only)
];

interface Particle {
  gridX: number;         // موقع الشبكة الأصلي (ساكن)
  gridY: number;
  size: number;
  baseOpacity: number;
  r: number; g: number; b: number;
  layer: 'A' | 'B' | 'C';
  phaseSeed: number;
}

interface OceanicWave {
  radius: number;
  intensity: number;
  speed: number;
  maxRadius: number;
  createdAt: number;
  width: number;
  fadeStart: number;
}

interface MoodParticlesProps {
  glowIntensity?: number;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export const MoodParticles = memo(({ glowIntensity = 0, audioRef }: MoodParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const glowIntensityRef = useRef(glowIntensity);
  useEffect(() => { glowIntensityRef.current = glowIntensity; }, [glowIntensity]);

  const activeWavesRef = useRef<OceanicWave[]>([]);
  const energyHistoryRef = useRef<number[]>([]);
  const ENERGY_HISTORY_SIZE = 30;
  const lastBeatTimeRef = useRef(0);
  const smoothBassRef = useRef(0);
  const adaptiveThresholdRef = useRef(1.30);

  useEffect(() => {
    const canvas = canvasRef.current;
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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // ─── بناء شبكة ماء منتظمة (Grid + slight jitter) ───
    const cw = window.innerWidth;
    const ch = window.innerHeight;

    let targetCount = isMobile ? 140 : (isTablet ? 220 : 320);
    if (lowEnd) targetCount = 75;

    // احسب grid step بحيث ينتج عدد قريب من targetCount
    const aspect = cw / ch;
    const rows = Math.round(Math.sqrt(targetCount / aspect));
    const cols = Math.round(targetCount / rows);
    const stepX = cw / cols;
    const stepY = ch / rows;
    const jitterAmount = Math.min(stepX, stepY) * 0.08; // 8% فقط

    const particles: Particle[] = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ratio = idx / (rows * cols);
        let layer: 'A' | 'B' | 'C' = 'B';
        if (ratio < 0.42) layer = 'A';
        else if (ratio < 0.92) layer = 'B';
        else layer = 'C';

        let size = 1, opacity = 0.5;
        if (layer === 'A') {
          size = Math.random() * 0.7 + 0.8;
          opacity = Math.random() * 0.12 + 0.16;
        } else if (layer === 'B') {
          size = Math.random() * 1.5 + 1.5;
          opacity = Math.random() * 0.25 + 0.35;
        } else {
          size = Math.random() * 1.5 + 2.5;
          opacity = Math.random() * 0.25 + 0.65;
        }

        let color = PALETTE[Math.floor(Math.random() * 4)];
        if (layer === 'C' && Math.random() < 0.05) color = PALETTE[4];

        // الموقع: مركز الخلية + jitter صغير
        const jx = (Math.random() - 0.5) * 2 * jitterAmount;
        const jy = (Math.random() - 0.5) * 2 * jitterAmount;
        particles.push({
          gridX: c * stepX + stepX * 0.5 + jx,
          gridY: r * stepY + stepY * 0.5 + jy,
          size,
          baseOpacity: opacity,
          r: color.r, g: color.g, b: color.b,
          layer,
          phaseSeed: Math.random() * Math.PI * 2,
        });
        idx++;
      }
    }

    const draw = (timestamp: number) => {
      if (document.hidden) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const canvasW = window.innerWidth;
      const canvasH = window.innerHeight;
      ctx.clearRect(0, 0, canvasW, canvasH);

      const cx = canvasW / 2;
      const cy = canvasH / 2;
      const maxScreenRadius = Math.hypot(canvasW, canvasH) / 2;

      // ─── AUDIO PROCESSING ───
      const audio = audioRef?.current;
      const analyser = audio ? (audio as any).__analyser : null;
      let rawBass = 0;

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        // أول 6 bins للـ deep bass (≈ 0-250Hz عند fftSize=1024 و sr=48000)
        let sum = 0;
        const N = Math.min(6, data.length);
        for (let i = 0; i < N; i++) sum += data[i];
        rawBass = (sum / N) / 255;
      } else {
        rawBass = glowIntensityRef.current;
      }

      // smoothing معتدل
      smoothBassRef.current = smoothBassRef.current * 0.50 + rawBass * 0.50;
      const sBass = smoothBassRef.current;

      // ─── ENERGY HISTORY BUFFER ───
      const instantEnergy = sBass * sBass;
      const history = energyHistoryRef.current;
      history.push(instantEnergy);
      if (history.length > ENERGY_HISTORY_SIZE) history.shift();

      const avgEnergy = history.length > 0
        ? history.reduce((a, b) => a + b, 0) / history.length : 0;

      let variance = 0;
      for (let i = 0; i < history.length; i++) {
        variance += (history[i] - avgEnergy) ** 2;
      }
      variance /= (history.length || 1);
      const C = Math.max(1.15, Math.min(1.50, -0.0025 * variance * 1000 + 1.40));
      adaptiveThresholdRef.current = adaptiveThresholdRef.current * 0.95 + C * 0.05;

      // ─── BEAT DETECTION ───
      const MIN_BEAT_GAP_MS = isMobile ? 900 : 750; // أكثر تباعداً للترتيب الأنيق
      const timeSinceLastBeat = timestamp - lastBeatTimeRef.current;
      const isBeat =
        instantEnergy > avgEnergy * adaptiveThresholdRef.current &&
        sBass > 0.18 &&  // عتبة منخفضة
        timeSinceLastBeat > MIN_BEAT_GAP_MS;

      if (isBeat) {
        // اقتل الموجة السابقة إن لم تصل 30%
        activeWavesRef.current = activeWavesRef.current.filter(
          w => w.radius / w.maxRadius > 0.30
        );

        const beatStrength = Math.min(1, (instantEnergy / (avgEnergy + 0.0001)) / 2);
        const maxRadius = maxScreenRadius * 1.4;
        const baseSpeed = isMobile ? 2.6 : 3.2;

        activeWavesRef.current.push({
          radius: 0,
          intensity: 0.60 + beatStrength * 0.50,
          speed: baseSpeed,
          maxRadius,
          createdAt: timestamp,
          width: isMobile ? 160 : 200,
          fadeStart: maxRadius * 0.60,
        });

        if (activeWavesRef.current.length > 3) {
          activeWavesRef.current.shift();
        }
        lastBeatTimeRef.current = timestamp;
      }

      // ─── UPDATE WAVES (ease-out cubic) ───
      activeWavesRef.current.forEach(wave => {
        const progress = wave.radius / wave.maxRadius;
        // ease-out cubic deceleration
        const decelerationFactor = Math.max(0.15, 1 - Math.pow(progress, 1.5) * 0.75);
        wave.radius += wave.speed * decelerationFactor;
        if (wave.radius > wave.fadeStart) {
          const fadeProgress = (wave.radius - wave.fadeStart) / 
                               (wave.maxRadius - wave.fadeStart);
          wave.intensity *= (1 - fadeProgress * 0.045);
        } else {
          wave.intensity *= 0.9988;
        }
      });
      activeWavesRef.current = activeWavesRef.current.filter(
        w => w.radius < w.maxRadius && w.intensity > 0.04
      );

      // ─── RENDER PARTICLES ───
      const renderedParticles = particles.map(p => {
        // 3-layer parallax
        let layerPushFactor = 1.0;
        let layerWiggleFactor = 1.0;
        let layerDarkenFactor = 1.0;
        if (p.layer === 'A') {
          layerPushFactor = 0.5; layerWiggleFactor = 0.45; layerDarkenFactor = 0.55;
        } else if (p.layer === 'C') {
          layerPushFactor = 1.6; layerWiggleFactor = 1.45; layerDarkenFactor = 1.35;
        }

        // ❌ NO DRIFT — الماء ساكن حتى تأتي الموجة
        // ✅ تنفس خفيف جداً ±0.4px فقط (حياة لطيفة)
        const breath = Math.sin(timestamp * 0.0006 + p.phaseSeed) * 0.4;
        const baseCurrentX = p.gridX + breath;
        const baseCurrentY = p.gridY + breath * 0.7;

        const dx = baseCurrentX - cx;
        const dy = baseCurrentY - cy;
        const dist = Math.hypot(dx, dy) || 1;

        let totalPush = 0;
        let peakFactor = 0;

        activeWavesRef.current.forEach(wave => {
          const deltaDist = dist - wave.radius;
          const f = Math.exp(-Math.pow(deltaDist / wave.width, 2));
          if (f > 0.01) {
            totalPush += f * wave.intensity * 38 * layerPushFactor;
            if (f > peakFactor) peakFactor = f * wave.intensity;
          }
        });
        peakFactor = Math.min(1, peakFactor);

        const pushX = (dx / dist) * totalPush;
        const pushY = (dy / dist) * totalPush;

        // High-frequency wiggle ONLY at wave peaks
        const wiggleFreq = 0.014;
        const wiggleScale = peakFactor * 28 * layerWiggleFactor;
        const wiggleX = Math.sin(timestamp * wiggleFreq + p.phaseSeed + 
                                 p.gridY * 0.05) * wiggleScale;
        const wiggleY = Math.cos(timestamp * wiggleFreq + p.phaseSeed + 
                                 p.gridX * 0.05) * wiggleScale;

        const finalX = baseCurrentX + pushX + wiggleX;
        const finalY = baseCurrentY + pushY + wiggleY;

        const finalSize = p.size * (1 + peakFactor * 0.70);
        const finalOpacity = p.baseOpacity * (0.60 + peakFactor * 0.40);

        // تحويل اللون إلى أسود قاتم في قمة الموجة
        let finalR = p.r, finalG = p.g, finalB = p.b;
        if (peakFactor > 0.01) {
          const darkenLimit = Math.min(peakFactor * 1.90 * layerDarkenFactor, 0.97);
          finalR = Math.round(p.r * (1 - darkenLimit));
          finalG = Math.round(p.g * (1 - darkenLimit));
          finalB = Math.round(p.b * (1 - darkenLimit));
        }

        return { x: finalX, y: finalY, size: finalSize, opacity: finalOpacity,
                 r: finalR, g: finalG, b: finalB, layer: p.layer, peakFactor };
      });

      // ─── DRAW IN LAYER ORDER ───
      // 1. Layer A
      ctx.globalCompositeOperation = 'source-over';
      renderedParticles.forEach(p => {
        if (p.layer !== 'A') return;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Connection web
      if (!lowEnd) {
        ctx.beginPath();
        for (let i = 0; i < renderedParticles.length; i++) {
          const p1 = renderedParticles[i];
          if (p1.layer === 'C') continue;
          for (let j = i + 1; j < renderedParticles.length; j++) {
            const p2 = renderedParticles[j];
            if (p2.layer === 'C') continue;
            const ddx = p1.x - p2.x, ddy = p1.y - p2.y;
            const distSq = ddx * ddx + ddy * ddy;
            if (distSq < 2400) {
              const d = Math.sqrt(distSq);
              const avgOp = (p1.opacity + p2.opacity) / 2;
              const peakDim = 1 - Math.max(p1.peakFactor, p2.peakFactor) * 0.7;
              ctx.strokeStyle = `rgba(${PALETTE[0].r},${PALETTE[0].g},${PALETTE[0].b},${(1 - d / 49) * 0.07 * avgOp * peakDim})`;
              ctx.lineWidth = 0.45;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // 3. Layer B
      renderedParticles.forEach(p => {
        if (p.layer !== 'B') return;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Layer C
      renderedParticles.forEach(p => {
        if (p.layer !== 'C') return;
        if (p.peakFactor > 0.45) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
          g.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${p.opacity})`);
          g.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.globalCompositeOperation = 'source-over';
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [audioRef]);

  return (
    <canvas
      ref={canvasRef}
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
