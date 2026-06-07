import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { X, Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';
import { PersonalPhotoFloater } from './PersonalPhotoFloater';
import { audioManager } from '../../audio/audioManager';
import { RetroViewportProvider } from '../RetroViewportProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalAssetUrl } from '../../constants/assets';
import type { Theme } from '../../utils/userPrefs';

const THEME_LABELS: Record<string, string> = {
  dark:     'Dark',
  light:    'Light',
  bit:      'Bit',
  midnight: 'Midnight',
  lite:     'Lite',
  retro:    'Retro',
};

const themeIconUrl = (t: Theme) =>
  t === 'retro'
    ? 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/retro.svg'
    : getLocalAssetUrl(
        t === 'dark' ? 'dark-mode.svg' :
        t === 'light' ? 'light-mode.svg' :
        t === 'bit' ? 'bit_mode.svg' :
        t === 'lite' ? 'lite_mode.svg' :
        'midnight_mode.svg'
      );

export const RetroWorldPage: React.FC = () => {
  const { theme, setTheme, setAudioIntent, setLoaded } = useAppContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const floaterRef = useRef<HTMLDivElement | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  useEffect(() => {
    if (theme === 'retro') {
      document.body.classList.add('retro-active');
    }
    return () => {
      document.body.classList.remove('retro-active');
      const iframeEl = iframeRef.current;
      const handler = handleScrollRef.current;
      if (iframeEl && handler) {
        try {
          iframeEl.contentWindow?.removeEventListener('scroll', handler);
          iframeEl.contentDocument?.removeEventListener('scroll', handler);
        } catch {}
      }
      handleScrollRef.current = null;
    };
  }, [theme]);

  // Effect 1: إنشاء وتدمير HLS و Audio — مرة واحدة فقط عند دخول/خروج retro
  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try { a.pause(); } catch {}
      try { a.removeAttribute('src'); a.load(); } catch {}
    };

    if (theme !== 'retro') {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioManager.stop('bg');
        purge(audioRef.current);
        audioRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    audio.muted = isAudioMuted;
    audioManager.register('bg', audio, 0.7);

    const source = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Kid_Cudi_By_Design/Kid_Cudi_By_Design.m3u8';

    const onAudioError = (e: any) => console.error('[RetroWorld] Audio source failed:', source, e);
    audio.addEventListener('error', onAudioError);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[RetroWorld] HLS error:', data.type, data.details);
      });
      hls.loadSource(source);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = source;
    }

    const playAudio = () => {
      if (cancelled) return;
      if (audioRef.current && !audioRef.current.muted) {
        audioManager.play('bg').catch(err =>
          console.warn('[RetroWorld] play blocked by audioManager:', err)
        );
      }
    };

    document.addEventListener('click', playAudio, { once: true });
    document.addEventListener('touchstart', playAudio, { once: true });

    return () => {
      cancelled = true;
      audio.removeEventListener('error', onAudioError);
      document.removeEventListener('click', playAudio);
      document.removeEventListener('touchstart', playAudio);
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
      audioManager.stop('bg');
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [theme]);  // ⚠️ فقط theme

  // Effect 2: تطبيق mute بدون إعادة إنشاء
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioManager.play('bg').catch(() => {});
        audioRef.current.muted = false;
        setIsAudioMuted(false);
      } else {
        audioManager.pause('bg');
        setIsAudioMuted(true);
      }
    } else {
      setIsAudioMuted(prev => !prev);
    }
  };

  // الدالة السحرية: التقاط التمرير من داخل الـ iframe وتعديل الـ transform مباشرة وبسرعة فائقة
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        if (iframe.contentWindow.document.readyState !== 'complete') {
          iframe.addEventListener('load', () => handleIframeLoad());
          return;
        }
      } catch (e) {
        // Ignored or logged if cross-origin
      }

      try {
        const cw = iframe.contentWindow;
        const cd = iframe.contentDocument;

        let ticked = false;
        const handleScroll = () => {
          if (!ticked) {
            window.requestAnimationFrame(() => {
              const sy = cw.scrollY || cd?.documentElement?.scrollTop || cd?.body?.scrollTop || 0;
              // Compensate for mobile viewport scaling: iframe internal coords
              // are in 880px space, visually scaled to match outer viewport.
              const iframeEl = iframeRef.current;
              const iframeVisualWidth = iframeEl ? iframeEl.clientWidth : 880;
              const scaleFactor = Math.min(1, iframeVisualWidth / 880);
              const adjustedSy = sy * scaleFactor;
              if (floaterRef.current) {
                floaterRef.current.style.transform = `translate3d(0, -${adjustedSy}px, 0)`;
              }
              ticked = false;
            });
            ticked = true;
          }
        };

        handleScrollRef.current = handleScroll;

        // استماع للتمرير داخل الـ iframe
        cw.addEventListener('scroll', handleScroll, { passive: true });
        cd?.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // تحديث أولي

        // تشغيل الموسيقى عند التفاعل مع الـ iframe
        const playAudio = () => {
          if (audioRef.current && theme === 'retro' && !isAudioMuted) {
            audioRef.current.play().catch(() => {});
          }
        };
        cd?.addEventListener('click', playAudio, { once: true });
        cd?.addEventListener('touchstart', playAudio, { once: true });
        cd?.addEventListener('scroll', playAudio, { once: true });
      } catch (e) {
        console.error('[RetroWorld] Iframe scroll tracking failed:', e);
      }
    }
  };

  if (theme !== 'retro') return null;

  return (
    <RetroViewportProvider desktopWidth={1024}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 9999, backgroundColor: '#000' }}>
        
        {/* أدوات التحكم العلوية (خروج + صوت) */}
      <style>{`
        .retro-control-btn:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 3px;
        }
      `}</style>
      <div style={{ 
        position: 'absolute', 
        top: 'calc(env(safe-area-inset-top, 0px) + 24px)', 
        right: 'calc(env(safe-area-inset-right, 0px) + 24px)', 
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* زر التحكم بالصوت (صغير وشفاف) */}
        <button
          type="button"
          onClick={toggleAudio}
          className="retro-control-btn"
          aria-label={isAudioMuted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
          style={{
            background: 'rgba(255, 255, 255, 0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.2)', 
            color: 'white',
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center', 
            cursor: 'pointer',
            transition: 'background-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          title={isAudioMuted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
        >
          {isAudioMuted ? <VolumeX size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
        </button>

        {/* زر تغيير الأوضاع (dropdown صغير وشفاف) */}
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => setIsThemeOpen(v => !v)}
            aria-expanded={isThemeOpen}
            aria-haspopup="menu"
            aria-label={`تغيير الوضع. الحالي: ${THEME_LABELS[theme] ?? theme}`}
            className="retro-control-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'transform 200ms ease, background-color 0.2s',
              transform: isThemeOpen ? 'rotate(90deg) scale(1.05)' : 'rotate(0deg) scale(1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <img
              src={themeIconUrl(theme)}
              alt=""
              aria-hidden="true"
              style={{
                width: '18px',
                height: '18px',
                objectFit: 'contain',
                filter: 'invert(1) brightness(2)',
              }}
            />
          </button>

          {/* القائمة المنسدلة لاختيار الأوضاع */}
          <AnimatePresence>
            {isThemeOpen && (
              <>
                {/* خلفية للإغلاق عند النقر بالخارج */}
                <motion.div
                  key="retro-theme-bd"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsThemeOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 99990,
                    cursor: 'default',
                  }}
                />
                
                {/* قائمة الخيارات */}
                <motion.div
                  key="retro-theme-menu"
                  role="menu"
                  initial={{ opacity: 0, y: -8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.92 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '6px',
                    background: 'rgba(15, 15, 20, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    zIndex: 99991,
                    minWidth: '140px',
                  }}
                >
                  {(['dark', 'light', 'midnight', 'bit', 'lite', 'retro'] as Theme[]).map((t, idx) => {
                    const isActive = theme === t;
                    return (
                      <motion.button
                        key={t}
                        role="menuitemradio"
                        aria-checked={isActive}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => {
                          setTheme(t);
                          setIsThemeOpen(false);
                          setAudioIntent('user-playing');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          textAlign: 'left',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.08)',
                          flexShrink: 0,
                        }}>
                          <img
                            src={themeIconUrl(t)}
                            alt=""
                            aria-hidden="true"
                            style={{
                              width: '12px',
                              height: '12px',
                              objectFit: 'contain',
                              filter: t === 'light' ? 'none' : 'invert(1) brightness(2)',
                            }}
                          />
                        </span>
                        <span style={{ flexGrow: 1 }}>
                          {THEME_LABELS[t] ?? t}
                        </span>
                      </motion.button>
                    );
                  })}
                  <motion.button
                    key="exit"
                    id="retro-theme-option-exit"
                    role="menuitem"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 6 * 0.03 }}
                    onClick={() => {
                      setLoaded(false);
                      setTheme('midnight');
                      setAudioIntent('user-paused');
                      setIsThemeOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ff4d4d',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      textAlign: 'left',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 77, 77, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 77, 77, 0.15)',
                      flexShrink: 0,
                    }}>
                      <X size={12} color="#ff4d4d" strokeWidth={2.5} />
                    </span>
                    <span style={{ flexGrow: 1 }}>
                      exit
                    </span>
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* الصور الشخصية: نمرر لها الـ ref للتحديث المباشر للـ DOM */}
      <PersonalPhotoFloater wrapperRef={floaterRef} />

      <iframe
        ref={iframeRef}
        onLoad={handleIframeLoad}
        src={`${import.meta.env.BASE_URL}retro/index.html`}
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        title="Retro World"
      />
    </div>
    </RetroViewportProvider>
  );
};