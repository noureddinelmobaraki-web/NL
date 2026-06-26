import { useEffect, useRef } from 'react';
import { audioEngine } from '../engine/audioEngine';

interface Visualizer2DProps {
  mode: 'bars' | 'radial' | 'wave';
  themeColor?: string;
}

export function Visualizer2D({ mode, themeColor = '#10b981' }: Visualizer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Peak tracking for classical bar drops
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas Resizing via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Match device pixel ratio for crystal clear rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const render = () => {
      const analyser = audioEngine.getAnalyser();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear with elegant translucent trail for smooth motion blur
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (!analyser) {
        // Draw elegant default ambient wave if no analyser is connected yet
        drawAmbientBackground(ctx, width, height, themeColor);
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (mode === 'wave') {
        analyser.getByteTimeDomainData(dataArray as any);
        drawWaveform(ctx, width, height, dataArray, bufferLength, themeColor);
      } else if (mode === 'radial') {
        analyser.getByteFrequencyData(dataArray as any);
        drawRadial(ctx, width, height, dataArray, bufferLength, themeColor);
      } else {
        analyser.getByteFrequencyData(dataArray as any);
        drawBars(ctx, width, height, dataArray, bufferLength, themeColor);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, themeColor]);

  // Fallback ambient wave when idle
  function drawAmbientBackground(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const time = Date.now() * 0.003;
    const midY = h / 2;

    for (let x = 0; x < w; x++) {
      const angle = (x / w) * Math.PI * 4 + time;
      const y = midY + Math.sin(angle) * 12 * Math.cos(angle * 0.4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Classical equalizer bars with falling physics peaks
  function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number, color: string) {
    // Limit to 48 beautiful bars for nice spacing
    const barCount = 48;
    const barWidth = (w / barCount) - 3;
    const step = Math.floor(len / barCount) || 1;

    // Grow or trim peaks array
    if (peaksRef.current.length !== barCount) {
      peaksRef.current = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      // Sample frequency spectrum log-arithmetically or evenly
      const dataIdx = i * step;
      const value = data[dataIdx] || 0;
      const percent = value / 255;
      const barHeight = Math.max(2, h * percent * 0.85);

      const x = i * (barWidth + 3);
      const y = h - barHeight;

      // Draw peak dot with physics drop
      let peak = peaksRef.current[i];
      if (barHeight > peak) {
        peak = barHeight;
      } else {
        peak -= 1.8; // Gravity drop speed
      }
      peaksRef.current[i] = Math.max(0, peak);

      // Draw Main Bar
      const grad = ctx.createLinearGradient(x, h, x, y);
      grad.addColorStop(0, 'rgba(15, 118, 110, 0.15)'); // Dark teal bottom
      grad.addColorStop(0.5, color);                   // Selected theme color
      grad.addColorStop(1, '#ffffff');                  // White top highlight

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw Peak Dot
      const peakY = h - peaksRef.current[i] - 3;
      if (peakY < h - 4) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, peakY, barWidth, 2);
      }
    }
  }

  // Circular pulsating ring of frequency pins
  function drawRadial(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number, color: string) {
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.22;
    const maxVal = 255;

    // Smooth average volume for bass-pulse ring
    let sum = 0;
    const pulseCount = 32;
    for (let i = 0; i < pulseCount; i++) {
      sum += data[i] || 0;
    }
    const avgVolume = sum / pulseCount;
    const ringPulse = (avgVolume / maxVal) * 18;

    // Draw center dark aesthetic circle
    ctx.fillStyle = 'rgba(9, 15, 30, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius + ringPulse, 0, Math.PI * 2);
    ctx.fill();

    // Draw frequency radial spikes
    const spikeCount = 80;
    const step = Math.floor(len / spikeCount) || 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const dataIdx = i * step;
      const value = data[dataIdx] || 0;
      const percent = value / maxVal;
      const spikeLen = Math.max(1, (h * 0.28) * percent);

      const rStart = baseRadius + ringPulse;
      const rEnd = rStart + spikeLen;

      const xStart = cx + Math.cos(angle) * rStart;
      const yStart = cy + Math.sin(angle) * rStart;
      const xEnd = cx + Math.cos(angle) * rEnd;
      const yEnd = cy + Math.sin(angle) * rEnd;

      // Draw spike
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();
    }
  }

  // Fluid oscilloscopic waveform
  function drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, len: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();

    const sliceWidth = w / len;
    let x = 0;

    for (let i = 0; i < len; i++) {
      const v = data[i] / 128.0; // center at 1.0
      const y = (v * h) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden rounded-xl bg-slate-950/40 border border-white/5">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
