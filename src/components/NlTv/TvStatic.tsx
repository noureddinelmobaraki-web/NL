/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

interface TvStaticProps {
  active: boolean; // True when channel is playing (highly dimmed noise), False when no channel is playing (prominent noise)
}

export function TvStatic({ active }: TvStaticProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 160;
    const H = 90;
    canvas.width = W;
    canvas.height = H;

    let rafId = 0;
    let lastTime = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (timestamp: number) => {
      // Limit updates to ~24fps to optimize CPU usage
      if (!reduceMotion && timestamp - lastTime > 1000 / 24) {
        const imgMeta = ctx.createImageData(W, H);
        const data = imgMeta.data;
        const len = data.length;

        for (let i = 0; i < len; i += 4) {
          const val = (Math.random() * 255) | 0;
          data[i] = val;     // Red
          data[i + 1] = val; // Green
          data[i + 2] = val; // Blue
          data[i + 3] = 255; // Alpha
        }

        ctx.putImageData(imgMeta, 0, 0);
        lastTime = timestamp;
      }
      rafId = requestAnimationFrame(draw);
    };

    if (reduceMotion) {
      // Draw single frame for users who prefer reduced motion
      const imgMeta = ctx.createImageData(W, H);
      const data = imgMeta.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        const val = (Math.random() * 255) | 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
      ctx.putImageData(imgMeta, 0, 0);
    } else {
      rafId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-full h-full transform scale-100 origin-center"
      style={{
        imageRendering: "pixelated",
        opacity: active ? 0.08 : 0.45,
        zIndex: 0,
        transition: "opacity 0.8s ease-in-out"
      }}
    />
  );
}
