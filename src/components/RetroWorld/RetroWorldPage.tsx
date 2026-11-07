/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import type Hls from 'hls.js';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import { useAppContext } from '../../context/AppContext';
import { RetroViewportProvider } from '../RetroViewportProvider';

interface RetroWorldPageProps {
  onClose?: () => void;
}

const RETRO_STREAM_URL =
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Kid_Cudi_By_Design/Kid_Cudi_By_Design.m3u8';

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

  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try {
        a.pause();
      } catch {
        /* ignore */
      }
      try {
        a.removeAttribute('src');
        a.load();
      } catch {
        /* ignore */
      }
    };

    if (!isRetroOpen) {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioManager.stop('retro');
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
    audio.muted = isAudioMutedRef.current;
    audioManager.register('retro', audio, 0.7);

    const onAudioError = (e: Event) => {
      console.warn('[RetroWorld] Audio source failed:', RETRO_STREAM_URL, e);
    };
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (isRetroOpen && !cancelled) {
        audioManager.play('retro').catch(() => {
          /* Autoplay prevented, waiting for user gesture */
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = RETRO_STREAM_URL;
    } else {
      void import('hls.js').then(({ default: HlsCtor }) => {
        if (cancelled) return;
        if (HlsCtor.isSupported()) {
          const hls = new HlsCtor({ startPosition: -1 });
          hlsRef.current = hls;
          hls.on(HlsCtor.Events.ERROR, (_, data) => {
            console.error('[RetroWorld] HLS error:', data.type, data.details);
          });
          hls.on(HlsCtor.Events.MANIFEST_PARSED, tryPlay);
          hls.loadSource(RETRO_STREAM_URL);
          hls.attachMedia(audio);
        }
      });
    }

    const cleanupAutoplay = ensureAutoplay('retro');
    tryPlay();

    return () => {
      cancelled = true;
      audio.removeEventListener('error', onAudioError);
      audio.removeEventListener('canplay', tryPlay);
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
      cleanupAutoplay();
      audioManager.stop('retro');
      try {
        audioManager.unregister('retro');
      } catch {
        /* ignore */
      }
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [isRetroOpen]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isAudioMuted;
    }
  }, [isAudioMuted]);

  if (!isRetroOpen) return null;

  return (
    <RetroViewportProvider desktopWidth={1024}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 9999,
          backgroundColor: '#000',
        }}
      >
        <style>{`
          .retro-control-btn:focus-visible {
            outline: 3px solid #fff;
            outline-offset: 3px;
          }
        `}</style>

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

        <button
          onClick={() => setIsAudioMuted((m) => !m)}
          className="retro-control-btn hover:scale-105 active:scale-95 transition-transform"
          aria-label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
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
          {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <iframe
          ref={iframeRef}
          src={`${import.meta.env.BASE_URL}retro/index.html`}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#000',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
          }}
          title="Retro World"
        />
      </div>
    </RetroViewportProvider>
  );
};