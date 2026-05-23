// src/components/MusicMood/MusicMoodScreen.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Song, LyricLine } from '../../types';
import { parseLRC } from '../LyricsEngine';
import { useHlsAudio } from '../../hooks/useHlsAudio';

interface MusicMoodScreenProps {
  songs: Song[];            // كل الأغاني الـ 25
  onExit: () => void;       // عند الخروج من الوضع
  existingAudioCtx?: AudioContext | null;
}

// ══════════════════════════════════
export const MusicMoodScreen = ({ songs, onExit, existingAudioCtx }: MusicMoodScreenProps) => {
  const [activeSong, setActiveSong]   = useState<Song | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics]           = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<string>('');
  const [nextLine, setNextLine]       = useState<string>('');
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [isEntering, setIsEntering]   = useState(true); // fade-in animation
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [needsUserTap, setNeedsUserTap] = useState(false);

  const audioRef = useRef<HTMLAudioElement>((() => {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    return a;
  })());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesAnimRef = useRef<number>(0);

  // ── قفل الـ overflow لمنع الـ scroll أثناء استعراض الشاشة
  useEffect(() => {
    const originalBody = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalBody; };
  }, []);

  // ── اختيار أغنية عشوائية
  const pickRandomSong = useCallback(() => {
    if (!songs.length) return;
    setDiceSpinning(true);
    setTimeout(() => setDiceSpinning(false), 600);

    const pool = activeSong
      ? songs.filter(s => s.id !== activeSong.id)
      : songs;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setActiveSong(picked);
    setCurrentTime(0);
    setLyrics([]);
    setCurrentLine('');
  }, [songs, activeSong]);

  // ── تشغيل أول أغنية عشوائية فور الدخول
  useEffect(() => {
    setIsEntering(true);
    // الـ fade in يحدث خلال آخر لحظة من الثقب الأسود (200ms كافية)
    const t1 = setTimeout(() => setIsEntering(false), 200);
    // تشغيل الأغنية بعد ظهور الشاشة
    const t2 = setTimeout(() => pickRandomSong(), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ربط HLS
  useHlsAudio(audioRef, activeSong?.url ?? null, () => {
    setAudioStatus('loading');
    // استئناف AudioContext قبل play — ضروري لـ Chrome policy
    const ctx = audioCtxRef.current;
    const tryPlay = async () => {
      try {
        if (ctx && ctx.state === 'suspended') await ctx.resume();
        await audioRef.current.play();
        setAudioStatus('playing');
      } catch (err) {
        console.warn('Play blocked — waiting for user tap:', err);
        // المتصفح يمنع التشغيل التلقائي — المستخدم يحتاج للضغط
        setAudioStatus('paused');
        setNeedsUserTap(true);
      }
    };
    tryPlay();
  });

  // ── تتبع الوقت
  useEffect(() => {
    const el = audioRef.current;
    const onTime  = () => setCurrentTime(el.currentTime);
    const onPlay  = () => setAudioStatus('playing');
    const onPause = () => setAudioStatus('paused');
    const onEnd   = () => pickRandomSong(); // عند انتهاء الأغنية → أغنية عشوائية تلقائياً

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play',       onPlay);
    el.addEventListener('pause',      onPause);
    el.addEventListener('ended',      onEnd);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play',       onPlay);
      el.removeEventListener('pause',      onPause);
      el.removeEventListener('ended',      onEnd);
    };
  }, [pickRandomSong]);

  // ── جلب وتحليل الـ LRC
  useEffect(() => {
    if (!activeSong?.lrc) { setLyrics([]); return; }
    const ctrl = new AbortController();
    const filename = activeSong.lrc.split('/').pop() || '';
    const encoded  = encodeURIComponent(filename);
    fetch(`${import.meta.env.BASE_URL}lrc/${encoded}`, { signal: ctrl.signal })
      .then(r => r.text())
      .then(text => parseLRC(text))
      .then(parsed => setLyrics(parsed))
      .catch(() => {});
    return () => ctrl.abort();
  }, [activeSong]);

  // ── تحديد الكلمات الحالية بناءً على الوقت
  useEffect(() => {
    if (!lyrics.length) return;
    let current = '', next = '';
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        current = lyrics[i].text;
        next    = lyrics[i + 1]?.text ?? '';
      }
    }
    setCurrentLine(current);
    setNextLine(next);
  }, [currentTime, lyrics]);

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
  }, [existingAudioCtx]);

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

  // ── play/pause
  const handlePlayPause = () => {
    setNeedsUserTap(false);
    // استئناف AudioContext إذا كان suspended (Chrome policy)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.warn('Play blocked:', err);
      });
    } else {
      audioRef.current.pause();
    }
  };

  // ── ESC للخروج
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  // ── إضافة gesture للخروج على الموبايل (swipe up)
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (diff > 80) onExit(); // swipe up = خروج
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend',   onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, [onExit]);

  // ── جزيئات عائمة مثل antigravity.google
  useEffect(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── إنشاء الجزيئات
    const PARTICLE_COUNT = window.innerWidth < 768 ? 40 : 80;
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number; opacity: number;
      rotation: number; rotSpeed: number;
      shape: 'dot' | 'dash';
      color: string;
    }

    const COLORS = [
      'rgba(120, 120, 120,',  // رمادي
      'rgba(180, 180, 200,',  // رمادي مزرق
      'rgba(100, 100, 180,',  // بنفسجي خفيف
      'rgba(160, 160, 200,',  // بنفسجي فاتح
      'rgba(100, 160, 100,',  // أخضر خفيف
      'rgba(200, 120, 120,',  // وردي خفيف
    ];

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.1, // ميل خفيف للأعلى
      size: Math.random() * 3 + 1.5,
      opacity: Math.random() * 0.35 + 0.1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      shape: Math.random() > 0.3 ? 'dash' : 'dot',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        // حرك الجزيئة
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // إعادة الجزيئة للشاشة إذا خرجت
        if (p.x < -20)  p.x = canvas.width  + 20;
        if (p.x > canvas.width  + 20) p.x = -20;
        if (p.y < -20)  p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.shape === 'dash') {
          // خط قصير مائل
          ctx.strokeStyle = `${p.color}1)`;
          ctx.lineWidth = p.size * 0.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-p.size * 2, 0);
          ctx.lineTo(p.size * 2, 0);
          ctx.stroke();
        } else {
          // نقطة دائرية
          ctx.fillStyle = `${p.color}1)`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      particlesAnimRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(particlesAnimRef.current);
    };
  }, []);

  // ── تنظيف كامل عند الخروج من MusicMood
  useEffect(() => {
    return () => {
      // أوقف الصوت
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
        audio.src = '';
      }
      // أغلق AudioContext
      audioCtxRef.current?.close().catch(() => {});
      // أوقف animation
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── وهج بسيط جداً — دائرة رمادية خفيفة في المركز تتنفس مع الموسيقى
  const glowRadius = 30 + glowIntensity * 40;      // أصغر وأكثر تركيزاً
  const glowOpacity = 0.04 + glowIntensity * 0.10; // خفيف جداً

  // ══════════════════════════════════
  // الـ JSX — الشاشة البيضاء النقية
  // ══════════════════════════════════
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isEntering ? 0 : 1,
        transition: 'opacity 0.8s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
        // منع أي تفاعل خارجي مع الصفحة تحتها
        pointerEvents: 'all',
      }}
    >
      {/* ══ وهج الخلفية يتفاعل مع الصوت ══ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle ${glowRadius}% at 50% 50%, rgba(0,0,0,${glowOpacity}) 0%, rgba(255,255,255,0) 70%)`,
          transition: 'background 0.1s ease',
          pointerEvents: 'none',
        }}
      />

      {/* ══ Particles Canvas — مثل antigravity.google ══ */}
      <canvas
        ref={particlesCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ══ اسم الأغنية ══ */}
      {activeSong && (
        <p
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 10vh)',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(9px, 1.5vw, 12px)',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.2)',
            fontWeight: 300,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {activeSong.title}
        </p>
      )}

      {/* ══ الكلمات الرئيسية (السطر الحالي) ══ */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '0 clamp(24px, 8vw, 120px)',
          marginBottom: '48px',
        }}
      >
        {/* السطر الحالي */}
        <p
          key={currentLine}
          style={{
            fontSize: 'clamp(20px, 4vw, 44px)',
            fontWeight: 200,
            color: 'rgba(0,0,0,0.80)',
            lineHeight: 1.5,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: '20px',
            // fade-in عند تغيير السطر
            animation: 'moodLineFadeIn 0.4s ease forwards',
            maxWidth: '650px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {currentLine || (audioStatus === 'loading' ? '...' : '')}
        </p>

        {/* السطر التالي (أشفّ) */}
        {nextLine && (
          <p
            style={{
              fontSize: 'clamp(13px, 2.2vw, 22px)',
              fontWeight: 200,
              color: 'rgba(0,0,0,0.25)',
              lineHeight: 1.5,
              margin: 0,
              letterSpacing: '-0.01em',
              maxWidth: '650px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
            }}
          >
            {nextLine}
          </p>
        )}

        {/* رسالة إذا لم تكن هناك كلمات */}
        {!activeSong?.lrc && activeSong && (
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: 'rgba(0,0,0,0.2)',
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            ♪ استمع...
          </p>
        )}
      </div>

      {/* ══ أزرار التحكم ══ */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        {/* زر Play/Pause */}
        <button
          onClick={handlePlayPause}
          aria-label={audioStatus === 'playing' ? 'إيقاف مؤقت' : 'تشغيل'}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '1.5px solid rgba(0,0,0,0.15)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            color: 'rgba(0,0,0,0.5)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.5)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.9)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.15)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.5)';
          }}
        >
          {audioStatus === 'playing' ? (
            // ■■ Pause
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1"/>
              <rect x="9" y="2" width="4" height="12" rx="1"/>
            </svg>
          ) : (
            // ▶ Play
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="3,2 14,8 3,14"/>
            </svg>
          )}
        </button>

        {/* نرد العشوائية — SVG ثلاثي الأبعاد */}
        <button
          onClick={pickRandomSong}
          aria-label="أغنية عشوائية"
          title="أغنية عشوائية"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '1.5px solid rgba(0,0,0,0.12)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            animation: diceSpinning ? 'moodDiceSpin 0.55s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
            padding: 0,
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.borderColor = 'rgba(0,0,0,0.4)';
            b.style.transform = 'scale(1.1) rotate(-8deg)';
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.borderColor = 'rgba(0,0,0,0.12)';
            b.style.transform = 'scale(1) rotate(0deg)';
          }}
        >
          {/* SVG نرد ثلاثي الأبعاد — يظهر وجه 3 */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* الوجه الأمامي (فاتح) */}
            <path
              d="M10 35 L50 15 L90 35 L90 75 L50 95 L10 75 Z"
              fill="rgba(0,0,0,0.07)"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* الوجه الأيمن (أغمق — ظل) */}
            <path
              d="M50 15 L90 35 L90 75 L50 55 Z"
              fill="rgba(0,0,0,0.18)"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* الوجه العلوي (أفتح — ضوء) */}
            <path
              d="M10 35 L50 15 L90 35 L50 55 Z"
              fill="rgba(0,0,0,0.04)"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* نقاط الوجه الأمامي — يُظهر رقم 3 */}
            {/* نقطة يسار أعلى */}
            <circle cx="28" cy="48" r="5" fill="rgba(0,0,0,0.6)" />
            {/* نقطة وسط */}
            <circle cx="50" cy="65" r="5" fill="rgba(0,0,0,0.6)" />
            {/* نقطة يمين أسفل */}
            <circle cx="72" cy="78" r="5" fill="rgba(0,0,0,0.6)" />

            {/* نقاط الوجه العلوي — رقم 2 */}
            <circle cx="36" cy="28" r="3.5" fill="rgba(0,0,0,0.35)" />
            <circle cx="64" cy="40" r="3.5" fill="rgba(0,0,0,0.35)" />
          </svg>
        </button>
      </div>

      {/* ══ زر الخروج — أسفل الشاشة، شفاف جداً ══ */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 32px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: 'rgba(0,0,0,0.2)',
          textTransform: 'uppercase',
          transition: 'color 0.2s',
          padding: '8px 16px',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.6)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.2)'; }}
      >
        ESC — exit mood
      </button>

      {/* ══ مؤشر loading دقيق ══ */}
      {audioStatus === 'loading' && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '2px',
            background: 'rgba(0,0,0,0.08)',
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '1px',
            animation: 'moodLoadingBar 1.2s ease infinite',
          }} />
        </div>
      )}

      {/* ══ Tap To Play overlay ══ */}
      {needsUserTap && (
        <div
          onClick={handlePlayPause}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            background: 'rgba(255,255,255,0.8)'
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
              <polygon points="18,14 36,24 18,34" fill="rgba(0,0,0,0.4)"/>
            </svg>
            <span style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'rgba(0,0,0,0.3)', fontWeight: 500 }}>
              TAP TO PLAY
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
