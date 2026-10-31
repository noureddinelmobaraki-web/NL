import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Hls from 'hls.js';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import { RetroViewportProvider } from '../RetroViewportProvider';
import { X } from 'lucide-react';

interface RetroWorldPageProps {
  onClose?: () => void;
}

export const RetroWorldPage: React.FC<RetroWorldPageProps> = ({ onClose }) => {
  const { isRetroOpen, closeRetro } = useAppContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const isAudioMutedRef = useRef(isAudioMuted);
  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    if (isRetroOpen) {
      document.body.classList.add('retro-active');
    }
    return () => {
      document.body.classList.remove('retro-active');
    };
  }, [isRetroOpen]);

  // Effect 1: إنشاء وتدمير HLS و Audio — مرة واحدة فقط عند دخول/خروج retro
  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try { a.pause(); } catch {}
      try { a.removeAttribute('src'); a.load(); } catch {}
    };

    if (!isRetroOpen) {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioManager.stop('retro');
        purge(audioRef.current);
        audioRef.current = null;
      }
      return;
    }

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    audio.muted = isAudioMutedRef.current;
    audioManager.register('retro', audio, 0.7);

    const source = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Kid_Cudi_By_Design/Kid_Cudi_By_Design.m3u8';

    const onAudioError = (e: any) => console.error('[RetroWorld] Audio source failed:', source, e);
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (isRetroOpen) {
        audioManager.play('retro').catch((err) => {
          console.log('[RetroWorld] Autoplay prevented, waiting user gesture.', err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[RetroWorld] HLS error:', data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(source);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = source;
    }

    const cleanupAutoplay = ensureAutoplay('retro');
    setIsAudioMuted(false);
    // محاولة تشغيل فورية أيضاً كدفعة أولى
    tryPlay();

    return () => {
      audio.removeEventListener('error', onAudioError);
      audio.removeEventListener('canplay', tryPlay);
      if (hlsRef.current) {
        try {
          hlsRef.current.off(Hls.Events.MANIFEST_PARSED, tryPlay);
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      cleanupAutoplay();
      audioManager.stop('retro');
      try { audioManager.unregister('retro'); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [isRetroOpen]);  // ⚠️ فقط isRetroOpen

  // Effect 2: تطبيق mute بدون إعادة إنشاء
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  if (!isRetroOpen) return null;

  return (
    <RetroViewportProvider desktopWidth={1024}>
      
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 9999, backgroundColor: '#000' }}>
        
        {/* أدوات التحكم العلوية (خروج + Audio) */}
      <style>{`
        .retro-control-btn:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 3px;
        }
      `}</style>

      {/* زر الخروج العائم المصمم بأسلوب زجاجي كلاسيكي ليتناسب مع ريترو */}
      <button
        onClick={() => onClose?.() || closeRetro()}
        className="retro-control-btn hover:scale-105 active:scale-95 transition-transform"
        aria-label="Close Retro"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 99999,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <X size={18} />
      </button>

      <iframe
        ref={iframeRef}
        src={`${import.meta.env.BASE_URL}retro/index.html`}
        loading="lazy"
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        title="Retro World"
      />
    </div>
    </RetroViewportProvider>
  );
};