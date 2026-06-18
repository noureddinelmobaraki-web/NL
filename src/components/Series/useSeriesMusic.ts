import { useEffect, useRef, useState } from 'react';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import Hls from 'hls.js';

const SERIES_BG_MUSIC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/movies_hls/index.m3u8';

export function useSeriesMusic(seriesActive: boolean) {
  const readyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // إيقاف/استئناف عند تشغيل المعاينة أو المسلسل
  useEffect(() => {
    if (!readyRef.current) return;
    if (seriesActive) {
      audioManager.pause('series');
    } else {
      audioManager.play('series').catch(() => {});
    }
  }, [seriesActive]);

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
    audioManager.register('series', audio, 0.6);

    const onAudioError = (e: any) => console.error('[SeriesMusic] Audio failed:', SERIES_BG_MUSIC, e);
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (!seriesActive) {
        audioManager.play('series').catch((err) => {
          console.log('[SeriesMusic] Autoplay delayed, waiting gesture.', err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[SeriesMusic] HLS error:', data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(SERIES_BG_MUSIC);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = SERIES_BG_MUSIC;
    }

    const cleanupAutoplay = ensureAutoplay('series');
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
      audioManager.stop('series');
      try { audioManager.unregister('series'); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioManager.isSourceActive('series')) {
        audioManager.pause('series');
        setIsMuted(true);
      } else {
        audioManager.play('series').catch(() => {});
        setIsMuted(false);
      }
    }
  };

  return { isMuted, toggleMute };
}
