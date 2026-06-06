// src/components/MusicMood/MusicMoodScreen.tsx // VIEWPORT-AWARE

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Song } from '../../types';
import { useHlsAudio } from '../../hooks/useHlsAudio';
import { audioManager } from '../../audio/audioManager';
import { useMoodAudioGraph } from './hooks/useMoodAudioGraph';
import { useMoodLyrics } from './hooks/useMoodLyrics';
import { useMoodGestures } from './hooks/useMoodGestures';
import { KaraokeText } from './KaraokeText';
import { MoodParticles } from './MoodParticles';
import { MoodControls } from './MoodControls';
import { useViewportSize } from '../../hooks/useViewportSize';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useButtonContext } from '../layout/ButtonOrchestrator';
import { useOrientationListener } from '../../hooks/useOrientationListener';

// === Stable Style Constants ===
const LYRIC_FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI", sans-serif';

const STYLE_CURRENT_LINE_MOBILE: React.CSSProperties = {
  fontFamily: LYRIC_FONT_STACK,
  fontSize: 'clamp(1.5rem, 6vw, 2.5rem)',
  fontWeight: 800,
  color: '#000000',
  WebkitTextStroke: '0.5px rgba(255,255,255,0.55)',
  paintOrder: 'stroke fill',
  textShadow: '0 1px 2px rgba(255,255,255,0.45)',
  lineHeight: 1.45,
  letterSpacing: '-0.01em',
  textWrap: 'balance',
  margin: 0,
  maxWidth: '90vw',
  overflowWrap: 'anywhere',
  background: 'transparent',
};

const STYLE_PREV_NEXT_MOBILE_BASE: React.CSSProperties = {
  fontFamily: LYRIC_FONT_STACK,
  fontSize: 'clamp(1rem, 4.6vw, 1.4rem)',
  fontWeight: 600,
  color: '#000000',
  WebkitTextStroke: '0.4px rgba(255,255,255,0.4)',
  paintOrder: 'stroke fill',
  textShadow: '0 1px 1.5px rgba(255,255,255,0.35)',
  lineHeight: 1.45,
  letterSpacing: '-0.01em',
  textWrap: 'balance',
  margin: 0,
  maxWidth: '90vw',
  overflowWrap: 'anywhere',
  background: 'transparent',
};

interface MusicMoodScreenProps {
  songs: Song[];            // كل الأغاني الـ 25
  onExit: () => void;       // عند الخروج من الوضع
  existingAudioCtx?: AudioContext | null;
}

// ══════════════════════════════════
export const MusicMoodScreen = ({ songs, onExit, existingAudioCtx }: MusicMoodScreenProps) => {
  const focusTrapRef = useFocusTrap(true);
  const viewport = useViewportSize();
  const { isDesktop } = useDeviceType();
  const { setContext } = useButtonContext();
  const [orientationKey, setOrientationKey] = useState(0);

  useOrientationListener(useCallback(() => setOrientationKey(prev => prev + 1), []));

  useEffect(() => {
    setContext('mebit');
    return () => setContext('page');
  }, [setContext]);
  const isMobileLyr = !isDesktop || (typeof window !== 'undefined' && window.innerWidth < 768);
  const [activeSong, setActiveSong]   = useState<Song | null>(null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const isEntering = false; // Mount immediately with full opacity
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [needsUserTap, setNeedsUserTap] = useState(false);

  const activeSongRef = useRef<Song | null>(null);
  useEffect(() => { activeSongRef.current = activeSong; }, [activeSong]);

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
  const { previousLine, currentLine, nextLine } = useMoodLyrics({
    activeSong,
    currentTime,
  });

  // ── اختيار أغنية عشوائية
  const pickRandomSong = useCallback(() => {
    if (!songs.length) return;
    setDiceSpinning(true);
    setTimeout(() => setDiceSpinning(false), 600);

    const current = activeSongRef.current;
    const pool = current
      ? songs.filter(s => s.id !== current.id)
      : songs;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setActiveSong(picked);
    setCurrentTime(0);
  }, [songs]);

  // ── play/pause
  const handlePlayPause = useCallback(() => {
    setNeedsUserTap(false);
    // استئناف AudioContext إذا كان suspended (Chrome policy)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (audioRef.current.paused) {
      audioManager.register('song', audioRef.current, 0.7);
      audioManager.play('song').catch(err => {
        console.warn('Play blocked:', err);
      });
    } else {
      audioManager.pause('song');
    }
  }, [audioCtxRef]);

  // ── إدارة الإيماءات والمفاتيح عبر الهوك المخصص
  useMoodGestures({
    onExit,
    handlePlayPause,
  });

  // ── تثبيت اتجاه الشاشة على الوضع الطولي (portrait) أثناء استخدام MusicMood ثم تركه حراً بعدها
  useEffect(() => {
    if (screen.orientation && 'lock' in screen.orientation) {
      (screen.orientation as any).lock('portrait').catch(() => {});
    }
    return () => {
      if (screen.orientation && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    };
  }, []);

  // ── تشغيل أول أغنية عشوائية فور الدخول
  useEffect(() => {
    // تشغيل الأغنية بعد ظهور الشاشة
    const t2 = setTimeout(() => pickRandomSong(), 200);
    return () => { clearTimeout(t2); };
    // FIXED: Issue #8 — intentionally empty to run once on mount. pickRandomSong excluded to avoid re-trigger.
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
        audioManager.register('song', audioRef.current, 0.7);
        await audioManager.play('song');
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
    let rafId = 0;
    let lastUpdate = 0;

    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate > 100) {
        setCurrentTime(el.currentTime);
        lastUpdate = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPlay  = () => { setAudioStatus('playing'); rafId = requestAnimationFrame(tick); };
    const onPause = () => { setAudioStatus('paused'); cancelAnimationFrame(rafId); };
    const onEnd   = () => pickRandomSong();

    el.addEventListener('play',  onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnd);

    if (!el.paused) { rafId = requestAnimationFrame(tick); }

    return () => {
      el.removeEventListener('play',  onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnd);
      cancelAnimationFrame(rafId);
    };
  }, [pickRandomSong]);

  // ── تنظيف كامل عند الخروج من MusicMood
  useEffect(() => {
    return () => {
      // أوقف الصوت
      const audio = audioRef.current;
      if (audio) {
        audioManager.stop('song');
        audio.src = '';
      }
      // أغلق AudioContext
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [audioCtxRef]);

  // ── وهج بسيط جداً — دائرة رمادية خفيفة في المركز تتنفس مع الموسيقى
  const glowRadius = 30 + glowIntensity * 40;      // أصغر وأكثر تركيزاً
  const glowOpacity = 0.04 + glowIntensity * 0.06; // خفيف جداً // AUDIO-REACTIVE-PARTICLES

  // ══════════════════════════════════
  // الـ JSX — الشاشة البيضاء النقية
  // ══════════════════════════════════
  return createPortal(
    <div
      key={orientationKey}
      ref={focusTrapRef}
      id="music-mood-immersive-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        background: 'radial-gradient(ellipse at center, #FAFAFA 0%, #FFFFFF 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isEntering ? 0 : 1,
        // FIXED: Issue #5 — small delay for smooth sync with blackhole bloom-out
        transition: 'opacity 0.5s ease 0.15s',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        // منع أي تفاعل خارجي مع الصفحة تحتها
        pointerEvents: 'all',
      }}
    >
      {/* FIXED: Issue #5 — Removed redundant white flash div */}

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
          if (!isDesktop) return;
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'rgba(0,0,0,0.25)';
          b.style.color = 'rgba(0,0,0,0.8)';
          b.style.background = '#FFFFFF';
          b.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={e => {
          if (!isDesktop) return;
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

      {/* ══ Particles Canvas — مثل antigravity.google ══ */ /* AUDIO-REACTIVE-PARTICLES */}
      <MoodParticles glowIntensity={glowIntensity} audioRef={audioRef} />

      {/* ══ اسم الأغنية ══ */}
      {activeSong && (
        <p
          aria-live="polite"
          style={{
            position: 'absolute',
            top: viewport.isLandscape ? '24px' : 'calc(env(safe-area-inset-top) + 10vh)',
            left: viewport.isLandscape ? '24px' : '50%',
            transform: viewport.isLandscape ? 'none' : 'translateX(-50%)',
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

      {/* ══ محتوى الشاشة: تقسيم أفقي في اللاندسكيب وتقسيم عمودي في البورتريه ══ */}
      <div
        style={{
          display: 'flex',
          flexDirection: viewport.isLandscape ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '1200px',
          padding: viewport.isLandscape ? '0 10vw' : '0',
          gap: viewport.isLandscape ? '64px' : '0',
          zIndex: 1,
        }}
      >
        {/* النصف الأيسر: الكلمات (في اللاندسكيب) */}
        <div
          style={{
            flex: viewport.isLandscape ? 1.2 : 'none',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: viewport.isLandscape ? '100%' : 'auto',
          }}
        >
          {/* ══ الكلمات الرئيسية (السطر الحالي) ══ */}
          <div
            aria-live="polite"
            style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              padding: viewport.isLandscape ? '0' : '0 clamp(24px, 8vw, 120px)',
              marginBottom: viewport.isLandscape ? '0' : '48px',
            }}
          >
            {isMobileLyr ? (
              /* MOBILE-LYRICS: 3-line sliding context, arab support, balance text-wrap */
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentLine?.time ?? 'empty'}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  {/* Previous Line (above, much fainter) */}
                  {previousLine && (
                    <p
                      dir="auto"
                      className="text-center"
                      style={{ ...STYLE_PREV_NEXT_MOBILE_BASE, opacity: 0.15 }}
                    >
                      <KaraokeText line={previousLine} currentTime={currentTime} isPrevious />
                    </p>
                  )}

                  {/* Current Line (Active) with scale-from-0.95 + glow flash that decays in 400ms */}
                  <motion.p
                    dir="auto"
                    className="text-center mood-lyric-current"
                    initial={{ scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      scale: { duration: 0.4, ease: 'easeOut' },
                      filter: { duration: 0.4, ease: 'easeOut' }
                    }}
                    style={STYLE_CURRENT_LINE_MOBILE}
                  >
                    {currentLine ? <KaraokeText line={currentLine} currentTime={currentTime} /> : (audioStatus === 'loading' ? '...' : '')}
                  </motion.p>

                  {/* Next Line */}
                  {nextLine && (
                    <p
                      dir="auto"
                      className="text-center"
                      style={{ ...STYLE_PREV_NEXT_MOBILE_BASE, opacity: 0.6 }}
                    >
                      <KaraokeText line={nextLine} currentTime={currentTime} isNext />
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              /* DESKTOP LYRICS: Original untouched rendering */
              <>
                <p
                  key={currentLine?.time ?? 'empty'}
                  style={{
                    fontSize: viewport.isLandscape ? 'clamp(18px, 3.5vw, 36px)' : 'clamp(22px, 4.5vw, 48px)',
                    fontWeight: 800,
                    color: '#000000',
                    lineHeight: 1.5,
                    letterSpacing: '-0.025em',
                    WebkitTextStroke: '0.8px rgba(255,255,255,0.6)',
                    paintOrder: 'stroke fill',
                    textShadow: '0 2px 4px rgba(255,255,255,0.4)',
                    fontOpticalSizing: 'auto',
                    margin: 0,
                    marginBottom: '20px',
                    // fade-in عند تغيير السطر
                    animation: 'moodLineFadeIn 0.4s ease forwards',
                    maxWidth: '650px',
                    fontFamily: LYRIC_FONT_STACK,
                  }}
                >
                  {currentLine ? <KaraokeText line={currentLine} currentTime={currentTime} /> : (audioStatus === 'loading' ? '...' : '')}
                </p>

                {/* السطر التالي (أشفّ) */}
                {nextLine && (
                  <p
                    style={{
                      fontSize: viewport.isLandscape ? 'clamp(12px, 2.2vw, 18px)' : 'clamp(14px, 2.4vw, 24px)',
                      fontWeight: 600,
                      color: '#000000',
                      opacity: 0.6,
                      lineHeight: 1.5,
                      margin: 0,
                      letterSpacing: '-0.01em',
                      WebkitTextStroke: '0.5px rgba(255,255,255,0.4)',
                      paintOrder: 'stroke fill',
                      textShadow: '0 1px 2px rgba(255,255,255,0.3)',
                      maxWidth: '650px',
                      fontFamily: LYRIC_FONT_STACK,
                    }}
                  >
                    <KaraokeText line={nextLine} currentTime={currentTime} isNext />
                  </p>
                )}
              </>
            )}

            {/* رسالة إذا لم تكن هناك كلمات */}
            {!activeSong?.lrc && activeSong && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '32px' }}>
                <svg width="40" height="24" viewBox="0 0 40 24" fill="currentColor" style={{ opacity: 0.3, color: 'rgba(0,0,0,0.82)' }}>
                  <circle cx="8" cy="12" r="3">
                    <animate attributeName="cy" values="12;6;12" dur="1s" repeatCount="indefinite" begin="0s" />
                  </circle>
                  <circle cx="20" cy="12" r="3">
                    <animate attributeName="cy" values="12;6;12" dur="1s" repeatCount="indefinite" begin="0.2s" />
                  </circle>
                  <circle cx="32" cy="12" r="3">
                    <animate attributeName="cy" values="12;6;12" dur="1s" repeatCount="indefinite" begin="0.4s" />
                  </circle>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* النصف الأيمن: أزرار التحكم (في اللاندسكيب) */}
        <div
          style={{
            flex: viewport.isLandscape ? 1 : 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* ══ أزرار التحكم ══ */}
          <MoodControls
            audioStatus={audioStatus}
            handlePlayPause={handlePlayPause}
            pickRandomSong={pickRandomSong}
            diceSpinning={diceSpinning}
          />
        </div>
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
        onMouseEnter={e => { if (isDesktop) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.6)'; }}
        onMouseLeave={e => { if (isDesktop) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.2)'; }}
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
