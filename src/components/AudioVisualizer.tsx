import React, { useEffect, useRef } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { isLowEndDevice } from '../utils/perf';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

// Global cache to persist graph nodes across re-mounts and avoid InvalidStateError (SEC-004)
const audioGraphCache = new WeakMap<HTMLAudioElement, {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  isConnected: boolean;
}>();

export const AudioVisualizer = ({ audioRef, isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const { isMobile } = useDeviceType();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }
    
    // Initialize or Retrieve from Cache
    let graph = audioGraphCache.get(audio);
    if (!graph) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128; 
        const source = ctx.createMediaElementSource(audio);
        
        graph = { ctx, source, analyser, isConnected: false };
        audioGraphCache.set(audio, graph);
      } catch (e) {
        // Fallback for browsers that block auto-init or have cross-origin issues
        return;
      }
    }

    const { ctx, source, analyser } = graph;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Connect nodes if not already marked as connected
    if (!graph.isConnected) {
      try {
        source.connect(analyser);
        analyser.connect(ctx.destination);
        graph.isConnected = true;
      } catch (e) {
        // Fallback catch for already connected states
        graph.isConnected = true;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    handleResize();
    window.addEventListener('resize', handleResize);

    let frameCount = 0;
    const lowEnd = isLowEndDevice();
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      
      // Performance throttling
      frameCount++;
      if ((isMobile || lowEnd) && frameCount % 2 !== 0) return;

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = bufferLength;
      const barWidth = (canvas.width / 2) / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.35);
        const alpha = Math.min(0.2, (dataArray[i] / 255) * 0.4); 
        canvasCtx.fillStyle = `rgba(var(--text-primary-rgb, 255, 255, 255), ${alpha})`;
        
        // Mirrored visualization
        canvasCtx.fillRect(
          canvas.width / 2 + i * barWidth,
          canvas.height - barHeight,
          barWidth - 1,
          barHeight
        );
        canvasCtx.fillRect(
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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      
      // Clean up connections on unmount as requested
      if (graph && graph.isConnected) {
        try {
          source.disconnect(analyser);
          analyser.disconnect(ctx.destination);
          graph.isConnected = false;
        } catch (e) {}
      }
    };
  }, [isPlaying, audioRef, isMobile]);

  return (
    <canvas
      id="audio-visualizer-canvas"
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
        transition: 'opacity 1.5s ease',
        willChange: 'transform',
        imageRendering: 'pixelated'
      }}
    />
  );
};
