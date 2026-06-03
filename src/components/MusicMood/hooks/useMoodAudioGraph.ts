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
  const animFrameRef = useRef<number>(0);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // ── Web Audio Setup — يُنشأ مرة واحدة فقط
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // إنشاء AudioContext مرة واحدة فقط طوال عمر المكوّن
    if (!audioCtxRef.current) {
      audioCtxRef.current = existingAudioCtx ?? new AudioContext();
    }
    const ctx = audioCtxRef.current;

    // استئناف إن كان suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // إنشاء analyser مرة واحدة
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.45;
      analyserRef.current.minDecibels = -85;
      analyserRef.current.maxDecibels = -15;
    }
    // Expose the analyser on the audio element for audio-reactive particles
    (audio as any).__analyser = analyserRef.current;

    // إنشاء MediaElementSource مرة واحدة فقط — هذا هو سبب المشكلة
    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
      } catch (err) {
        // إذا رُمي InvalidStateError، الـ source موجود بالفعل في graph آخر
        console.warn('MediaElementSource already created:', err);
        return;
      }
    }

    // ربط الـ graph: source → analyser → destination (السماعات)
    sourceNodeRef.current.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    return () => {
      // FIXED: Issue #2 — Proper cleanup of AudioNodes
      try {
        sourceNodeRef.current?.disconnect();
      } catch (_) { /* ignore: already disconnected */ }
      try {
        analyserRef.current?.disconnect();
      } catch (_) { /* ignore */ }
      cancelAnimationFrame(animFrameRef.current);
      // AudioContext closure is handled by MusicMoodScreen onExit
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
    let fallbackInterval: number | null = null;
    
    const checkCorsAndFallback = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const sum = data.reduce((a, b) => a + b, 0);
      
      if (sum === 0 && !audio.paused) {
        // CORS فشل → ابدأ pseudo-bass fallback
        console.info('[Mood] CORS blocked HLS analyser → activating pseudo-bass');
        const bpm = 95;  // متوسط BPM للأغاني الهادئة
        const beatInterval = 60000 / bpm;
        
        // استبدل __analyser بـ pseudo-analyser
        (audio as any).__analyser = {
          frequencyBinCount: analyser.frequencyBinCount,
          getByteFrequencyData: (out: Uint8Array) => {
            // محاكاة Bass nice + harmonics
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
    
    // افحص بعد 800ms من بدء التشغيل
    const onPlay = () => {
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = window.setTimeout(checkCorsAndFallback, 800);
    };
    audio.addEventListener('play', onPlay);
    
    return () => {
      audio.removeEventListener('play', onPlay);
      if (checkTimer) clearTimeout(checkTimer);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [activeSong, audioRef]);

  // ── حلقة قياس الـ bass لتحريك الـ glow
  useEffect(() => {
    const tick = () => {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        // نأخذ متوسط الـ bass (أول 8 قيم)
        const bass = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
        setGlowIntensity(bass / 255); // 0 → 1
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return {
    glowIntensity,
    analyserRef,
    audioCtxRef,
    animFrameRef,
  };
}
