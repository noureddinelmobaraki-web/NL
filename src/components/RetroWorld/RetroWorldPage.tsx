import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { X, Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';
import { PersonalPhotoFloater } from './PersonalPhotoFloater';
import { audioManager } from '../../audio/audioManager';
import { RetroViewportProvider } from '../RetroViewportProvider';

export const RetroWorldPage: React.FC = () => {
  const { theme, setTheme, setAudioIntent } = useAppContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const floaterRef = useRef<HTMLDivElement | null>(null);
  const handleScrollRef = useRef<(() => void) | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const handleLeaveRetro = () => {
    setTheme('midnight');
    setAudioIntent('user-playing');
  };

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
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, backgroundColor: '#000' }}>
        
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
        gap: '12px'
      }}>
        {/* زر التحكم بالصوت */}
        <button
          type="button"
          onClick={toggleAudio}
          className="retro-control-btn"
          aria-label={isAudioMuted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
          style={{
            background: 'rgba(255, 0, 0, 0.85)', border: '2px solid rgba(255, 0, 0, 1)', color: 'white',
            width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.6), inset 0 0 5px rgba(255, 255, 255, 0.3)',
            transition: 'transform 0.2s',
          }}
          title={isAudioMuted ? "تشغيل الموسيقى" : "كتم الموسيقى"}
        >
          {isAudioMuted ? <VolumeX size={24} strokeWidth={3} /> : <Volume2 size={24} strokeWidth={3} />}
        </button>

        {/* زر الخروج */}
        <button
          type="button"
          onClick={handleLeaveRetro}
          className="retro-control-btn"
          aria-label="الخروج من الوضع الريترو"
          style={{
            background: 'rgba(255, 0, 0, 0.85)', border: '2px solid rgba(255, 0, 0, 1)', color: 'white',
            width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 0, 0.6), inset 0 0 5px rgba(255, 255, 255, 0.3)',
            transition: 'transform 0.2s',
          }}
          title="خروج من الوضع"
        >
          <X size={24} strokeWidth={3} />
        </button>
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