import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { audioManager } from '../../audio/audioManager';
import { ensureAutoplay } from '../../audio/ensureAutoplay';
import { soundGovernor } from '../../audio/soundGovernor';
import type Hls from 'hls.js';

export const LIQUID_GLASS_BG_AUDIO_URL =
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/poBG/index.m3u8';

const CHANNEL_ID = 'bg:liquidGlass';
const AMBIENCE_VOLUME = 0.55;

export function useLiquidGlassAudio(src: string = LIQUID_GLASS_BG_AUDIO_URL) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const wantAmbienceRef = useRef<boolean>(true);
  const videoUnregisterRef = useRef<(() => void) | null>(null);

  const externalMuted = useSyncExternalStore(
    (cb) => audioManager.subscribeMuted(cb),
    () => audioManager.isMuted(),
    () => false,
  );

  const onToggleMute = useCallback(() => {
    audioManager.toggleMuted();
  }, []);

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

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    wantAmbienceRef.current = true;

    audioManager.register('liquidGlass', audio, AMBIENCE_VOLUME);

    const tryPlay = () => {
      if (!wantAmbienceRef.current) return;
      void audioManager.play('liquidGlass', { force: true }).then(() => {
        if (!wantAmbienceRef.current) {
          audioManager.pause('liquidGlass', 180);
        }
      });
    };

    audio.addEventListener('canplay', tryPlay);

    const unregisterGov = soundGovernor.register({
      id: CHANNEL_ID,
      kind: 'background',
      priority: 40,
      isPlaying: () => !audio.paused && !audio.ended && audio.volume > 0,
      pause: () => audioManager.pause('liquidGlass'),
      stop: () => audioManager.stop('liquidGlass'),
    });

    const onPlaying = () => {
      try {
        if (!audio.muted && audio.volume > 0) {
          soundGovernor.notePlaying(CHANNEL_ID);
        }
      } catch {
        /* noop */
      }
    };

    const onPause = () => {
      try {
        soundGovernor.noteStopped(CHANNEL_ID);
      } catch {
        /* noop */
      }
    };

    const onVolumeChange = () => {
      try {
        if (audio.muted || audio.volume === 0 || audio.paused) {
          soundGovernor.noteStopped(CHANNEL_ID);
        } else {
          soundGovernor.notePlaying(CHANNEL_ID);
        }
      } catch {
        /* noop */
      }
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('volumechange', onVolumeChange);

    let cancelled = false;
    void (async () => {
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;
      if (HlsLib.isSupported()) {
        const hls = new HlsLib({ startPosition: -1 });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          if (!cancelled && wantAmbienceRef.current) {
            tryPlay();
          }
        });
        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        });
        hls.loadSource(src);
        hls.attachMedia(audio);
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src;
        tryPlay();
      }
    })();

    const cleanupAutoplay = ensureAutoplay('liquidGlass', {
      force: true,
      verify: () => !audio.paused,
    });

    tryPlay();

    return () => {
      cancelled = true;
      audio.removeEventListener('canplay', tryPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('volumechange', onVolumeChange);

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

      if (videoUnregisterRef.current) {
        try {
          videoUnregisterRef.current();
        } catch {
          /* ignore */
        }
        videoUnregisterRef.current = null;
      }

      cleanupAutoplay();
      unregisterGov();
      try {
        soundGovernor.noteStopped(CHANNEL_ID);
      } catch {
        /* noop */
      }
      try {
        audioManager.releaseExclusive('liquid_glass_video');
      } catch {
        /* noop */
      }
      try {
        audioManager.stop('liquidGlass');
      } catch {
        /* noop */
      }
      try {
        audioManager.unregister('liquidGlass');
      } catch {
        /* noop */
      }
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [src]);

  const onVideoAudioActiveChange = useCallback((isVideoAudible: boolean) => {
    if (isVideoAudible) {
      wantAmbienceRef.current = false;
      audioManager.pause('liquidGlass', 180);
      soundGovernor.silenceSong();
      audioManager.requestExclusive('video', 'liquid_glass_video');
    } else {
      audioManager.releaseExclusive('liquid_glass_video');
    }
  }, []);

  const onVideoElementMount = useCallback((el: HTMLMediaElement | null) => {
    if (videoUnregisterRef.current) {
      try {
        videoUnregisterRef.current();
      } catch {
        /* ignore */
      }
      videoUnregisterRef.current = null;
    }
    if (el) {
      el.muted = audioManager.isMuted();
      videoUnregisterRef.current = audioManager.registerExternal('video', {
        isPlaying: () => !el.paused && !el.ended,
        pause: () => el.pause(),
      });
    }
  }, []);

  return {
    onVideoAudioActiveChange,
    onVideoElementMount,
    externalMuted,
    onToggleMute,
  };
}
