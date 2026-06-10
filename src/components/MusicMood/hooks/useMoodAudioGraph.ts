import { useEffect, useRef, useState, RefObject } from 'react';
import type { Song } from '../../../types';

export interface AudioBands {
  subBass: number;  // 0..1
  bass: number;     // 0..1
  lowMid: number;   // 0..1
  mid: number;      // 0..1
  treble: number;   // 0..1
  level: number;    // متوسط عام 0..1
  beat: number;     // نبضة دقّة 0..1 (تتلاشى)
}

interface UseMoodAudioGraphProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  existingAudioCtx?: AudioContext | null;
  activeSong: Song | null;
}

const EMPTY_BANDS: AudioBands = {
  subBass: 0, bass: 0, lowMid: 0, mid: 0, treble: 0, level: 0, beat: 0,
};

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

  // النطاقات الحيّة (تُقرأ من المجسّمات بلا re-render)
  const bandsRef = useRef<AudioBands>({ ...EMPTY_BANDS });

  // EMA + beat-detection state
  const bassEmaRef = useRef(0);
  const lastBeatRef = useRef(0);
  const beatPulseRef = useRef(0);
  // throttle لتحديث glow كـ state
  const lastGlowSetRef = useRef(0);

  // ── إنشاء الـ graph مرّة واحدة فقط (لا تغيير عن السابق) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try {
        const AudioContextClass: typeof AudioContext =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
          (undefined as unknown as typeof AudioContext);
        if (!AudioContextClass) {
          console.warn('[useMoodAudioGraph] AudioContext not supported');
          return;
        }
        audioCtxRef.current = existingAudioCtx ?? new AudioContextClass();
      } catch (err) {
        console.warn('[useMoodAudioGraph] AudioContext init failed:', err);
        return;
      }
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.18;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
    }
    (audio as unknown as { __analyser?: AnalyserNode }).__analyser = analyserRef.current;

    if (!freqDataRef.current || freqDataRef.current.length !== analyserRef.current.frequencyBinCount) {
      freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } catch (err) {
        console.info('[useMoodAudioGraph] reusing existing graph:', (err as Error).message);
        try { analyserRef.current.connect(ctx.destination); } catch {}
      }
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [audioRef, existingAudioCtx]);

  // ── destructor نهائي (كما السابق) ──
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      try { sourceNodeRef.current?.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      sourceNodeRef.current = null;
      analyserRef.current = null;
      const c = audioCtxRef.current;
      if (c && !existingAudioCtx && c.state !== 'closed') {
        c.close().catch((err) => console.warn('[useMoodAudioGraph] close failed:', err));
      }
      audioCtxRef.current = null;
      freqDataRef.current = null;
    };
  }, [existingAudioCtx]);

  // ── استئناف عند تغيير الأغنية ──
  useEffect(() => {
    if (!activeSong) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [activeSong]);

  // ── CORS fallback: Procedural Beat Synth متعدّد النطاقات ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeSong) return;
    const checkTimers: number[] = [];
    let fallbackActive = false;

    const checkCorsAndFallback = () => {
      const analyser = analyserRef.current;
      if (!analyser || fallbackActive) return;
      if (!freqDataRef.current || freqDataRef.current.length !== analyser.frequencyBinCount) {
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const data = freqDataRef.current;
      analyser.getByteFrequencyData(data as any);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];

      if (sum === 0 && !audio.paused && audio.currentTime > 0.3) {
        fallbackActive = true;
        console.info('[Mood] CORS-blocked HLS → procedural beat synth (multi-band)');
        let bpm = 95;
        if (audio.duration && isFinite(audio.duration)) {
          if (audio.duration < 150) bpm = 110;
          else if (audio.duration > 240) bpm = 80;
          else bpm = 95;
        }
        const beatInterval = 60 / bpm;
        (audio as unknown as { __analyser: unknown }).__analyser = {
          frequencyBinCount: analyser.frequencyBinCount,
          getByteFrequencyData: (out: Uint8Array) => {
            const t = audio.currentTime;
            const beatPos = (t / beatInterval) % 4;
            const kickPhase = Math.min(beatPos % 2, 1);
            const kickEnv = Math.exp(-kickPhase * 8) * 240;
            const snarePhase = Math.abs(beatPos - 1) < 0.5 ? Math.abs(beatPos - 1) :
                              Math.abs(beatPos - 3) < 0.5 ? Math.abs(beatPos - 3) : 1;
            const snareEnv = Math.exp(-snarePhase * 12) * 180;
            const hihatPhase = (beatPos * 2) % 1;
            const hihatEnv = Math.exp(-hihatPhase * 16) * 100;
            const wobble = Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.7) * 0.03;
            for (let i = 0; i < out.length; i++) {
              let val = 0;
              if (i < 8) val = kickEnv * (1 + wobble);
              else if (i < 30) val = kickEnv * 0.3 + Math.sin(t * 2 + i * 0.3) * 20 + 40;
              else if (i < 80) val = snareEnv * (i < 60 ? 0.8 : 0.4) + 20;
              else if (i < 180) val = snareEnv * 0.5 + hihatEnv * 0.3 + 15;
              else val = hihatEnv * Math.max(0, 1 - (i - 180) / 300) + 5;
              out[i] = Math.max(0, Math.min(255, Math.floor(val)));
            }
          },
        };
      }
    };

    const onPlay = () => {
      checkTimers.push(window.setTimeout(checkCorsAndFallback, 600));
      checkTimers.push(window.setTimeout(checkCorsAndFallback, 1500));
      checkTimers.push(window.setTimeout(checkCorsAndFallback, 3000));
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      checkTimers.forEach(clearTimeout);
      fallbackActive = false;
    };
  }, [activeSong, audioRef]);

  // ── حلقة التحليل متعدّد النطاقات + beat detection ──
  useEffect(() => {
    const tick = () => {
      const analyser = analyserRef.current;
      if (analyser) {
        if (!freqDataRef.current || freqDataRef.current.length !== analyser.frequencyBinCount) {
          freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        const data = freqDataRef.current;
        analyser.getByteFrequencyData(data as any);
        const len = data.length;

        let subBassSum = 0, bassSum = 0, lowMidSum = 0, midSum = 0, trebleSum = 0, total = 0;
        for (let i = 0; i < len; i++) {
          const v = data[i];
          total += v;
          if (i < 8) subBassSum += v;
          else if (i < 30) bassSum += v;
          else if (i < 80) lowMidSum += v;
          else if (i < 200) midSum += v;
          else if (i < 500) trebleSum += v;
        }
        const subBass = subBassSum / 8 / 255;
        const bass = bassSum / 22 / 255;
        const lowMid = lowMidSum / 50 / 255;
        const mid = midSum / 120 / 255;
        const treble = trebleSum / Math.min(300, Math.max(1, len - 200)) / 255;
        const level = total / len / 255;

        // beat detection adaptive على البيس
        const bassNow = subBass * 0.7 + bass * 0.3;
        bassEmaRef.current = bassEmaRef.current * 0.992 + bassNow * 0.008;
        const now = performance.now();
        const threshold = Math.max(0.08, bassEmaRef.current * 1.35);
        if (bassNow > threshold && now - lastBeatRef.current > 180) {
          lastBeatRef.current = now;
          beatPulseRef.current = 1;
        } else {
          beatPulseRef.current *= 0.9;
        }

        const b = bandsRef.current;
        b.subBass = subBass; b.bass = bass; b.lowMid = lowMid;
        b.mid = mid; b.treble = treble; b.level = level;
        b.beat = beatPulseRef.current;

        // glow = مزيج بيس + نبضة، مع throttle لتقليل re-renders
        const glow = Math.min(1, bassNow * 0.85 + beatPulseRef.current * 0.4);
        if (now - lastGlowSetRef.current > 40) {
          lastGlowSetRef.current = now;
          setGlowIntensity(glow);
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  return {
    glowIntensity,
    bandsRef,
    analyserRef,
    audioCtxRef,
    animFrameRef,
  };
}
