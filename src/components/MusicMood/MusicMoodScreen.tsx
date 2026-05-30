// src/components/MusicMood/MusicMoodScreen.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '../../types';
import { useHlsAudio } from '../../hooks/useHlsAudio';
import { useMoodAudioGraph } from './hooks/useMoodAudioGraph';
import { useMoodLyrics } from './hooks/useMoodLyrics';
import { useMoodGestures } from './hooks/useMoodGestures';
import { MoodParticles } from './MoodParticles';
import { MoodControls } from './MoodControls';

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
  const [isEntering, setIsEntering]   = useState(true); // fade-in animation
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [needsUserTap, setNeedsUserTap] = useState(false);

  const audioRef = useRef<HTMLAudioElement>((() => {
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    return a;
  })());

  // ── جلب وتتبع الصوت (Web Audio Setup) عبر الهوك المخصص
  const { glowIntensity, audioCtxRef } = useMoodAudioGraph({
    audioRef,
    existingAudioCtx,
    activeSong,
  });

  // ── تتبع الكلمات ومزامنتها عبر الهوك المخصص
  const { currentLine, nextLine } = useMoodLyrics({
    activeSong,
    currentTime,
  });

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
  }, [songs, activeSong]);

  // ── play/pause
  const handlePlayPause = useCallback(() => {
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
  }, [audioCtxRef]);

  // ── إدارة الإيماءات والمفاتيح عبر الهوك المخصص
  useMoodGestures({
    onExit,
    handlePlayPause,
  });

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
    };
  }, [audioCtxRef]);

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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

      {/* ══ زر إغلاق (X) دقيق وأنيق للشاشات والهواتف ══ */}
      <button
        onClick={onExit}
        aria-label="إغلاق"
        title="إغلاق"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top) + 24px)',
          right: 'calc(env(safe-area-inset-right) + 24px)',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '1.5px solid rgba(0,0,0,0.08)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2147483647,
          transition: 'all 0.2s ease',
          color: 'rgba(0,0,0,0.4)',
          padding: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'rgba(0,0,0,0.25)';
          b.style.color = 'rgba(0,0,0,0.8)';
          b.style.background = '#FFFFFF';
          b.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'rgba(0,0,0,0.08)';
          b.style.color = 'rgba(0,0,0,0.4)';
          b.style.background = 'rgba(255,255,255,0.7)';
          b.style.transform = 'scale(1)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* ══ Particles Canvas — مثل antigravity.google ══ */}
      <MoodParticles />

      {/* ══ اسم الأغنية ══ */}
      {activeSong && (
        <p
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 10vh)',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(10px, 1.5vw, 12px)',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.22)',
            fontWeight: 400,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            fontSize: 'clamp(22px, 4.5vw, 48px)',
            fontWeight: 300,
            color: 'rgba(0,0,0,0.82)',
            lineHeight: 1.45,
            letterSpacing: '-0.025em',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            fontOpticalSizing: 'auto',
            margin: 0,
            marginBottom: '20px',
            // fade-in عند تغيير السطر
            animation: 'moodLineFadeIn 0.4s ease forwards',
            maxWidth: '650px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {currentLine || (audioStatus === 'loading' ? '...' : '')}
        </p>

        {/* السطر التالي (أشفّ) */}
        {nextLine && (
          <p
            style={{
              fontSize: 'clamp(14px, 2.4vw, 24px)',
              fontWeight: 300,
              color: 'rgba(0,0,0,0.28)',
              lineHeight: 1.5,
              margin: 0,
              letterSpacing: '-0.01em',
              maxWidth: '650px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
      <MoodControls
        audioStatus={audioStatus}
        handlePlayPause={handlePlayPause}
        pickRandomSong={pickRandomSong}
        diceSpinning={diceSpinning}
      />

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
