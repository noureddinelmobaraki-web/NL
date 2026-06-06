import { useEffect, useRef, useState, RefObject } from 'react';
import type { Song } from '../../../types';

interface UseMoodAudioGraphProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  existingAudioCtx?: AudioContext | null;
  activeSong: Song | null;
}

export function useMoodAudioGraph({
  audioRef,
  existingAudioCtx,
  activeSong,
}: UseMoodAudioGraphProps) {
  const [glowIntensity, setGlowIntensity] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = existingAudioCtx ?? new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.45;
      analyserRef.current.minDecibels = -85;
      analyserRef.current.maxDecibels = -15;
    }
    audio.__analyser = analyserRef.current;

    if (!freqDataRef.current || freqDataRef.current.length !== analyserRef.current.frequencyBinCount) {
      freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } catch (err) {
        console.warn('MediaElementSource already exists — reusing graph:', err);
        try { analyserRef.current.connect(ctx.destination); } catch {}
      }
    } else {
      try { analyserRef.current.connect(ctx.destination); } catch {}
    }

    return () => {
      try { sourceNodeRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      sourceNodeRef.current = null;
      analyserRef.current = null;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const c = audioCtxRef.current;
      if (c && !existingAudioCtx && c.state !== 'closed') {
        c.close().catch(err => console.warn('[useMoodAudioGraph] close failed:', err));
      }
      audioCtxRef.current = null;
    };
  }, [existingAudioCtx, audioRef]);

  // ── استئناف AudioContext عند تغيير الأغنية (يحل مشكلة suspended)
  useEffect(() => {
    if (!activeSong) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [activeSong]);

  // ── CORS fallback detection: إن كان HLS بدون CORS، حلّ بديل
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeSong) return;
    
    let checkTimer: number | null = null;
    
    const checkCorsAndFallback = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      if (!freqDataRef.current || freqDataRef.current.length !== analyser.frequencyBinCount) {
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const data = freqDataRef.current;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      
      if (sum === 0 && !audio.paused) {
        console.info('[Mood] CORS blocked HLS analyser → activating pseudo-bass');
        const bpm = 95;
        const beatInterval = 60000 / bpm;
        
        audio.__analyser = {
          frequencyBinCount: analyser.frequencyBinCount,
          getByteFrequencyData: (out: Uint8Array) => {
            const t = performance.now() / beatInterval;
            const beat = Math.max(0, Math.sin(t * Math.PI * 2));
            const decay = Math.pow(beat, 4);
            for (let i = 0; i < out.length; i++) {
              if (i < 8) out[i] = Math.floor(decay * 220 + Math.random() * 20);
              else if (i < 40) out[i] = Math.floor(decay * 80);
              else out[i] = Math.floor(decay * 30);
            }
          }
        };
      }
    };
    
    const onPlay = () => {
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = window.setTimeout(checkCorsAndFallback, 800);
    };
    audio.addEventListener('play', onPlay);
    
    return () => {
      audio.removeEventListener('play', onPlay);
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [activeSong, audioRef]);

  // ── حلقة قياس الـ bass لتحريك الـ glow
  useEffect(() => {
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        if (!freqDataRef.current || freqDataRef.current.length !== analyser.frequencyBinCount) {
          freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        const data = freqDataRef.current;
        analyser.getByteFrequencyData(data);
        // نأخذ متوسط الـ bass (أول 8 قيم) بدون allocation
        let bassSum = 0;
        for (let i = 0; i < 8; i++) {
          bassSum += data[i];
        }
        const bass = bassSum / 8;
        setGlowIntensity(bass / 255); // 0 → 1
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      freqDataRef.current = null;
    };
  }, []);

  return {
    glowIntensity,
    analyserRef,
    audioCtxRef,
    animFrameRef,
  };
}
