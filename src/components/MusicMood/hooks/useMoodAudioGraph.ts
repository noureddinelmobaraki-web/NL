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
      analyserRef.current.fftSize = 64;
    }

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
      // لا تُفصل عند تغيير الأغنية — فقط عند unmount المكوّن كاملاً
    };
  }, [existingAudioCtx, audioRef]);

  // ── استئناف AudioContext عند تغيير الأغنية (يحل مشكلة suspended)
  useEffect(() => {
    if (!activeSong) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [activeSong]);

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
