import { useEffect, useRef } from 'react';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import { GAMES_BG_MUSIC } from '../../constants/assets';
import Hls from 'hls.js';

export function useGamesMusic(gameActive: boolean) {
  const readyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // إيقاف/استئناف عند اختيار/ترك لعبة 
  useEffect(() => {
    if (!readyRef.current) return;
    if (gameActive) {
      audioManager.pause('games');
    } else {
      audioManager.play('games').catch(() => {});
    }
  }, [gameActive]);

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
    audioManager.register('games', audio, 0.6);

    const onAudioError = (e: any) => console.error('[GamesMusic] Audio source failed:', GAMES_BG_MUSIC, e);
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (!gameActive) {
        audioManager.play('games').catch((err) => {
          console.log('[GamesMusic] Autoplay prevented, waiting user gesture.', err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[GamesMusic] HLS error:', data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(GAMES_BG_MUSIC);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = GAMES_BG_MUSIC;
    }

    const cleanupAutoplay = ensureAutoplay('games');
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
      audioManager.stop('games');
      try { audioManager.unregister('games'); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, []); // Run once on mount! gameActive dependency is missing purposely for the init (controlled by the other effect)
}
