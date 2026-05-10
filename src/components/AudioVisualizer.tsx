import React, { useEffect, useRef } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
}

export const AudioVisualizer = ({ audioRef, isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    if (!isPlaying || !audioRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }
    
    // Init AudioContext once
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 128; // Reduced for performance
      } catch (e) {
        console.error('AudioContext init failed:', e);
      }
    }

    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const audio = audioRef.current;
    if (!audio || !audioCtxRef.current || !analyserRef.current) return;

    try {
      if (!sourceRef.current) {
        sourceRef.current = audioCtxRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
    } catch (e) {
      // Already connected or CORS issue
      try {
        analyserRef.current.connect(audioCtxRef.current.destination);
      } catch (_) {}
    }

    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d')!;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    handleResize();
    window.addEventListener('resize', handleResize);

    let frameCount = 0;
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      
      // Mobile throttling: skip every other frame
      frameCount++;
      if (isMobile && frameCount % 2 !== 0) return;

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mirrored bars from center bottom
      const barCount = bufferLength;
      const barWidth = (canvas.width / 2) / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.35);
        const alpha = Math.min(0.2, (dataArray[i] / 255) * 0.4); // Subtle reactive opacity
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        
        // Right side
        ctx.fillRect(
          canvas.width / 2 + i * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        );
        // Left side (mirrored)
        ctx.fillRect(
          canvas.width / 2 - (i + 1) * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        );
      }
    };
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, audioRef, isMobile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 1s ease',
        willChange: 'transform',
        imageRendering: 'pixelated'
      }}
    />
  );
};
