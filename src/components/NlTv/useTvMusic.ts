import { useEffect, useRef } from 'react';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import { TV_BG_MUSIC } from '../../constants/assets';
import Hls from 'hls.js';

/** channelPlaying = true عند تشغيل قناة تلفاز فعلية → نوقف موسيقى الخلفية */
export function useTvMusic(channelPlaying: boolean) {
  const readyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!readyRef.current) return;
    if (channelPlaying) {
      audioManager.pause('tv');
    } else {
      audioManager.play('tv').catch(() => {});
    }
  }, [channelPlaying]);

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
    audioManager.register('tv', audio, 0.5);

    const onAudioError = (e: any) => console.error('[TvMusic] Audio source failed:', TV_BG_MUSIC, e);
    audio.addEventListener('error', onAudioError);

    const tryPlay = () => {
      if (!channelPlaying) {
        audioManager.play('tv').catch((err) => {
          console.log('[TvMusic] Autoplay prevented, waiting user gesture.', err);
        });
      }
    };

    audio.addEventListener('canplay', tryPlay);

    if (Hls.isSupported()) {
      const hls = new Hls({ startPosition: -1 });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[TvMusic] HLS error:', data.type, data.details);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.loadSource(TV_BG_MUSIC);
      hls.attachMedia(audio);
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = TV_BG_MUSIC;
    }

    const cleanupAutoplay = ensureAutoplay('tv');
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
      audioManager.stop('tv');
      try { audioManager.unregister('tv'); } catch {}
      purge(audioRef.current);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // مرة واحدة عند التركيب؛ channelPlaying يُدار بالـ effect الآخر
}
