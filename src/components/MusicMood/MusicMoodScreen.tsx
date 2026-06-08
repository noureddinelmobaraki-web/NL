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
import { TIMING, AUDIO, GLOW } from './constants';

interface MusicMoodScreenProps {
  songs: Song[];
  initialSong?: Song | null;
  onExit: () => void;
  existingAudioCtx?: AudioContext | null;
}

// ══════════════════════════════════
export const MusicMoodScreen = ({ songs, initialSong, onExit, existingAudioCtx }: MusicMoodScreenProps) => {
  const [trapReady, setTrapReady] = useState(false);
  const focusTrapRef = useFocusTrap(trapReady);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTrapReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const viewport = useViewportSize();
  const { isDesktop } = useDeviceType();
  const { setContext } = useButtonContext();
  const [, forceLayoutTick] = useState(0);
  useOrientationListener(useCallback(() => {
    // tick لإعادة قراءة viewport وحساب styles فقط
    forceLayoutTick(prev => prev + 1);
  }, []));

  useEffect(() => {
    setContext('mebit');
    return () => setContext('page');
  }, [setContext]);
  const isMobileLyr = !isDesktop || (typeof window !== 'undefined' && window.innerWidth < 768);
  const [activeSong, setActiveSong]   = useState<Song | null>(initialSong || null);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [currentTime, setCurrentTime] = useState(0);

  const [diceSpinning, setDiceSpinning] = useState(false);
  const [needsUserTap, setNeedsUserTap] = useState(false);

  const activeSongRef = useRef<Song | null>(null);
  useEffect(() => { activeSongRef.current = activeSong; }, [activeSong]);

  const diceTimeoutRef = useRef<number | null>(null);

  // تنظيف diceTimeout عند unmount
  useEffect(() => {
    return () => {
      if (diceTimeoutRef.current !== null) {
        clearTimeout(diceTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Lazy single-instance Audio creation — guarantees only ONE element created.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null) {
    const a = new Audio();
    a.crossOrigin = AUDIO.CROSS_ORIGIN;
    a.preload = 'auto';
    audioRef.current = a;
  }

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
    if (diceTimeoutRef.current !== null) {
      clearTimeout(diceTimeoutRef.current);
    }
    diceTimeoutRef.current = window.setTimeout(() => {
      setDiceSpinning(false);
      diceTimeoutRef.current = null;
    }, TIMING.DICE_SPIN_DURATION);

    const current = activeSongRef.current;
    const pool = current
      ? songs.filter(s => s.id !== current.id)
      : songs;
    if (!pool.length) return; // حماية إضافية

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
    if (audioRef.current?.paused) {
      audioManager.register('song', audioRef.current, AUDIO.DEFAULT_VOLUME);
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
    // FIXED: حماية شاملة من أخطاء lock/unlock على Desktop و iOS Safari
    const isMobileLike = typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    if (!isMobileLike) return;

    const orient = screen.orientation;
    if (!orient || typeof orient.lock !== 'function') return;

    try {
      orient.lock('portrait').catch(() => {/* تجاهل بصمت */});
    } catch { /* تجاهل */ }

    return () => {
      try {
        if (typeof orient.unlock === 'function') orient.unlock();
      } catch { /* تجاهل */ }
    };
  }, []);

  // ── تشغيل المقطع فور الدخول
  useEffect(() => {
    // إذا كانت هناك أغنية مبدئية، لا حاجة لـ cleanup
    if (initialSong) return undefined;

    // وإلا اختر واحدة عشوائية بعد 200ms
    const t2 = setTimeout(() => pickRandomSong(), TIMING.PICK_RANDOM_DELAY);
    return () => clearTimeout(t2);
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
        if (!audioRef.current) return;
        audioManager.register('song', audioRef.current, AUDIO.DEFAULT_VOLUME);
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
    if (!el) return;
    let rafId = 0;
    let lastUpdate = 0;

    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate > TIMING.THROTTLE_TIME_UPDATE) {
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
  // FIXED: useMoodAudioGraph يتولى إغلاق AudioContext بنفسه — لا نكرر الإغلاق هنا
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        try { audioManager.stop('song'); } catch {}
        try { audio.pause(); } catch {}
        try { audio.removeAttribute('src'); audio.load(); } catch {}
      }
      // ❌ تم حذف audioCtxRef.current?.close() — useMoodAudioGraph يتكفل بهذا
    };
  }, []);

  // ── وهج بسيط جداً — دائرة رمادية خفيفة في المركز تتنفس مع الموسيقى
  const glowRadius = GLOW.RADIUS_BASE + glowIntensity * GLOW.RADIUS_MULTIPLIER;      // أصغر وأكثر تركيزاً
  const glowOpacity = GLOW.OPACITY_BASE + glowIntensity * GLOW.OPACITY_MULTIPLIER; // خفيف جداً // AUDIO-REACTIVE-PARTICLES

  // ══════════════════════════════════
  // الـ JSX — الشاشة البيضاء النقية
  // ══════════════════════════════════
  return createPortal(
    <div
      ref={focusTrapRef}
      id="music-mood-immersive-overlay"
      className="mood-overlay"
    >
      {/* FIXED: Issue #5 — Removed redundant white flash div */}

      {/* ══ وهج الخلفية يتفاعل مع الصوت ══ */}
      <div
        className="mood-glow"
        style={{
          '--glow-radius': `${glowRadius}%`,
          '--glow-opacity': glowOpacity,
        } as React.CSSProperties}
      />

      {/* ══ زر إغلاق (X) دقيق وأنيق للشاشات والهواتف ══ */}
      <button
        onClick={onExit}
        aria-label="إغلاق"
        title="إغلاق"
        className="mood-close-btn"
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
          className={`mood-title ${viewport.isLandscape ? 'landscape' : ''}`}
        >
          {activeSong.title}
        </p>
      )}

      {/* ══ محتوى الشاشة: تقسيم أفقي في اللاندسكيب وتقسيم عمودي في البورتريه ══ */}
      <div
        className={`mood-content-container ${viewport.isLandscape ? 'landscape' : ''}`}
      >
        {/* النصف الأيسر: الكلمات (في اللاندسكيب) */}
        <div
          className={`mood-lyrics-wrapper ${viewport.isLandscape ? 'landscape' : ''}`}
        >
          {/* ══ الكلمات الرئيسية (السطر الحالي) ══ */}
          <div
            aria-live="polite"
            className={`mood-lyrics-content ${viewport.isLandscape ? 'landscape' : ''}`}
          >
            {isMobileLyr ? (
              /* MOBILE-LYRICS: 3-line sliding context, arab support, balance text-wrap */
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={currentLine?.time ?? 'empty'}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                  className="flex flex-col items-center justify-center gap-3 w-full"
                >
                  {/* Previous Line (above, much fainter) */}
                  {previousLine && (
                    <p
                      dir="auto"
                      className="text-center mood-lyric-mobile-prev-next opacity-[0.15]"
                    >
                      <KaraokeText line={previousLine} currentTime={currentTime} isPrevious />
                    </p>
                  )}

                  {/* Current Line (Active) with scale-from-0.95 + glow flash that decays in 400ms */}
                  <motion.p
                    dir="auto"
                    className="text-center mood-lyric-current mood-lyric-mobile-current"
                    initial={{ scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ scale: 1, filter: 'blur(0px)' }}
                    transition={{
                      scale: { duration: 0.4, ease: 'easeOut' },
                      filter: { duration: 0.4, ease: 'easeOut' }
                    }}
                  >
                    {currentLine ? <KaraokeText line={currentLine} currentTime={currentTime} /> : (audioStatus === 'loading' ? '...' : '')}
                  </motion.p>

                  {/* Next Line */}
                  {nextLine && (
                    <p
                      dir="auto"
                      className="text-center mood-lyric-mobile-prev-next opacity-[0.6]"
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
                  className={`mood-desk-lyric-current ${viewport.isLandscape ? 'landscape' : ''}`}
                >
                  {currentLine ? <KaraokeText line={currentLine} currentTime={currentTime} /> : (audioStatus === 'loading' ? '...' : '')}
                </p>

                {/* السطر التالي (أشفّ) */}
                {nextLine && (
                  <p
                    className={`mood-desk-lyric-next ${viewport.isLandscape ? 'landscape' : ''}`}
                  >
                    <KaraokeText line={nextLine} currentTime={currentTime} isNext />
                  </p>
                )}
              </>
            )}

            {/* رسالة إذا لم تكن هناك كلمات */}
            {!activeSong?.lrc && activeSong && (
              <div className="flex justify-center items-center min-h-[32px]">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="currentColor" className="opacity-30 text-[rgba(0,0,0,0.82)]">
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
          className={`mood-controls-wrapper ${viewport.isLandscape ? 'landscape' : ''}`}
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
        className="mood-exit-btn"
      >
        ESC — exit mood
      </button>

      {/* ══ مؤشر loading دقيق ══ */}
      {audioStatus === 'loading' && (
        <div className="mood-loading-container">
          <div className="mood-loading-bar" />
        </div>
      )}

      {/* ══ Tap To Play overlay ══ */}
      {needsUserTap && (
        <div onClick={handlePlayPause} className="mood-tap-to-play">
          <div className="mood-tap-to-play-inner">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
              <polygon points="18,14 36,24 18,34" fill="rgba(0,0,0,0.4)"/>
            </svg>
            <span className="mood-tap-to-play-text">
              TAP TO PLAY
            </span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
