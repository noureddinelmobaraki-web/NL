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

    // FIXED: AudioContext إنشاء مرة واحدة فقط طوال عمر الـ audio element
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      try {
        const AudioContextClass: typeof AudioContext =
          window.AudioContext ??
          window.webkitAudioContext ??
          undefined;

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

    // FIXED: Analyser ينشأ مرة واحدة فقط ولا يُدمَّر إلا عند unmount نهائي
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;             // ↑ من 1024 — دقة أعلى لكشف البيس
      analyserRef.current.smoothingTimeConstant = 0.18; // ↓ من 0.45 — استجابة أسرع لدقات الإيقاع
      analyserRef.current.minDecibels = -90;          // ↓ من -85 — يلتقط حتى الترددات الخافتة
      analyserRef.current.maxDecibels = -10;          // ↑ من -15 — هامش أوسع للذروات
    }
    audio.__analyser = analyserRef.current;

    if (!freqDataRef.current || freqDataRef.current.length !== analyserRef.current.frequencyBinCount) {
      freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    // FIXED: MediaElementSource ينشأ مرة واحدة فقط — لا يُدمَّر أبداً
    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } catch (err) {
        // إذا كان audio element مرتبط بـ source سابق (re-mount)، تجاهل بصمت
        console.info('[useMoodAudioGraph] reusing existing graph:', (err as Error).message);
        try { analyserRef.current.connect(ctx.destination); } catch {}
      }
    }

    // FIXED: cleanup فقط يُلغي الـ animation frame ولا يدمّر الـ graph
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // ❌ لا ندمر sourceNode / analyser / context — لأنها لا يمكن إعادة إنشاؤها على نفس audio
      // الإغلاق النهائي يحدث في destructor المكوّن (انظر BUG #7)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // ← dependencies فاضية متعمدة — الـ graph ينشأ مرة واحدة فقط

  // FIXED: Final destructor — يعمل مرة واحدة فقط عند unmount نهائي
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
        c.close().catch(err => console.warn('[useMoodAudioGraph] close failed:', err));
      }
      audioCtxRef.current = null;
      freqDataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── استئناف AudioContext عند تغيير الأغنية (يحل مشكلة suspended)
  useEffect(() => {
    if (!activeSong) return;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [activeSong]);

  // ── CORS fallback detection: فحص متكرر + استبدال ذكي بـ pseudo-bass متطور
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeSong) return;

    const checkTimers: number[] = [];
    let fallbackActive = false;

    const checkCorsAndFallback = () => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      if (fallbackActive) return; // مرة واحدة كافية

      if (!freqDataRef.current || freqDataRef.current.length !== analyser.frequencyBinCount) {
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      const data = freqDataRef.current;
      analyser.getByteFrequencyData(data as any);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];

      // إذا الصوت يلعب لكن المُحلّل صفر = CORS block على HLS
      if (sum === 0 && !audio.paused && audio.currentTime > 0.3) {
        fallbackActive = true;
        console.info('[Mood] CORS-blocked HLS detected → activating procedural beat synth');

        // ─── Procedural Beat Synthesizer ───
        // محاكاة pattern موسيقي حقيقي: kick على beats 1,3 + snare على 2,4 + hi-hat 8ths
        let bpm = 95;
        // محاولة استنتاج BPM من duration الأغنية إذا متاح
        if (audio.duration && isFinite(audio.duration)) {
          // تخمين ذكي: أغاني تحت 180s غالباً hip-hop ~ 85-100 BPM
          // أغاني فوق 240s غالباً ballad ~ 70-90 BPM
          if (audio.duration < 150) bpm = 110;
          else if (audio.duration > 240) bpm = 80;
          else bpm = 95;
        }
        const beatInterval = 60 / bpm; // ثواني لكل beat

        audio.__analyser = {
          frequencyBinCount: analyser.frequencyBinCount,
          getByteFrequencyData: (out: Uint8Array) => {
            const t = audio.currentTime; // مزامنة مع الـ playback الفعلي
            const beatPos = (t / beatInterval) % 4; // مكان داخل measure من 4 beats

            // Kick drum على beats 0 و 2 (downbeat + 3rd)
            const kickPhase = Math.min(beatPos % 2, 1);
            const kickEnv = Math.exp(-kickPhase * 8) * 240; // decay سريع

            // Snare على beats 1 و 3 (backbeat)
            const snarePhase = Math.abs(beatPos - 1) < 0.5 ? Math.abs(beatPos - 1) :
                              Math.abs(beatPos - 3) < 0.5 ? Math.abs(beatPos - 3) : 1;
            const snareEnv = Math.exp(-snarePhase * 12) * 180;

            // Hi-hat على كل 8th note
            const hihatPhase = (beatPos * 2) % 1;
            const hihatEnv = Math.exp(-hihatPhase * 16) * 100;

            // إضافة تذبذب عشوائي ناعم لكسر التكرار الميكانيكي
            const wobble = Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.7) * 0.03;

            for (let i = 0; i < out.length; i++) {
              let val = 0;
              // Bass band (0-8): kick drum
              if (i < 8) val = kickEnv * (1 + wobble);
              // Low-mid (8-30): residual kick + bass guitar
              else if (i < 30) val = kickEnv * 0.3 + Math.sin(t * 2 + i * 0.3) * 20 + 40;
              // Mid (30-80): snare body
              else if (i < 80) val = snareEnv * (i < 60 ? 0.8 : 0.4) + 20;
              // Hi-mid (80-180): snare crack + vocals
              else if (i < 180) val = snareEnv * 0.5 + hihatEnv * 0.3 + 15;
              // High (180+): hi-hat + cymbals
              else val = hihatEnv * Math.max(0, 1 - (i - 180) / 300) + 5;

              out[i] = Math.max(0, Math.min(255, Math.floor(val)));
            }
          },
        };
      }
    };

    const onPlay = () => {
      // فحص متعدد: 600ms, 1500ms, 3000ms — يغطي حالات HLS البطيء
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
      // عند تغيير الأغنية، أعد تفعيل الفحص للأغنية الجديدة
      fallbackActive = false;
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
        analyser.getByteFrequencyData(data as any);
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
