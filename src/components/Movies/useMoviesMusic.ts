import { useEffect, useRef, useState } from 'react';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import Hls from 'hls.js';

const MOVIES_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/movies_hls/index.m3u8';

export function useMoviesMusic(movieActive: boolean) {
  const readyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // إيقاف/استئناف عند تشغيل المعاينة أو الفيلم
  useEffect(() => {
    if (!readyRef.current) return;
    if (movieActive) {
      audioManager.pause('movies');
    } else {
      audioManager.play('movies').catch(() => {});
    }
  }, [movieActive]);

  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try { a.pause(); } catch {}
      try { a.removeAttribute('src'); a.load(); } catch {}
    };

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = 'anonymous';

    // تسجيل في مدير الصوت
    audioManager.register('movies', audio, 0.6);

    const onAudioError = (e: any) => console.error('[MoviesMusic] Audio failed:', MOVIES_BG_MUSIC, e);
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (!movieActive) {
        audioManager.play('movies').catch((err) => {
          console.log('[MoviesMusic] Autoplay delayed, waiting gesture.', err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[MoviesMusic] HLS error:', data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(MOVIES_BG_MUSIC);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = MOVIES_BG_MUSIC;
    }

    const cleanupAutoplay = ensureAutoplay('movies');
    readyRef.current = true;
    tryPlay();

    return () => {
      audio.removeEventListener('error', onAudioError);
      audio.removeEventListener('canplay', tryPlay);
      if (hlsRef.current) {
        try {
          hlsRef.current.off(Hls.Events.MANIFEST_PARSED, tryPlay);
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      cleanupAutoplay();
      readyRef.current = false;
      audioManager.stop('movies');
      try { audioManager.unregister('movies'); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioManager.isSourceActive('movies')) {
        audioManager.pause('movies');
        setIsMuted(true);
      } else {
        audioManager.play('movies').catch(() => {});
        setIsMuted(false);
      }
    }
  };

  return { isMuted, toggleMute };
}
