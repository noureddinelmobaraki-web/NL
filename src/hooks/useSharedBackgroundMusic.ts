import { useEffect, useRef, useState } from "react";
import { audioManager } from "../audio/audioManager";
import { ensureAutoplay } from "../audio/ensureAutoplay";
import { soundGovernor } from "../audio/soundGovernor";
import type Hls from "hls.js";

type MusicKey =
  | "bg"
  | "song"
  | "lens"
  | "video"
  | "mebit"
  | "intro"
  | "games"
  | "movies"
  | "series"
  | "tv"
  | "retro"
  | "xp";

interface SharedMusicOptions {
  key: MusicKey;
  url: string;
  volume?: number;
  profileId?: string;
}

export function useSharedBackgroundMusic(
  isActive: boolean,
  options: SharedMusicOptions,
) {
  const { key, url, volume = 0.6, profileId } = options;
  const shouldAutoPlay = (profileId ?? key) === "retro";
  const readyRef = useRef(false);
  const userEnabledRef = useRef(shouldAutoPlay);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMuted, setIsMuted] = useState(!shouldAutoPlay);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!readyRef.current) return;
    if (isActive) {
      audioManager.pause(key);
    } else if (userEnabledRef.current) {
      audioManager.play(key).catch(() => {});
    }
  }, [isActive, key]);

  useEffect(() => {
    const purge = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try {
        a.pause();
      } catch {}
      try {
        a.removeAttribute("src");
        a.load();
      } catch {}
    };

    const audio = new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.crossOrigin = "anonymous";
    audioManager.register(key, audio, volume);

    const onAudioError = (e: unknown) => {
      console.error(
        `[SharedBackgroundMusic:${key}] Audio source failed:`,
        url,
        e,
      );
    };
    audio.addEventListener("error", onAudioError);

    const tryPlay = () => {
      if (!userEnabledRef.current) return;
      if (!isActiveRef.current) {
        audioManager.play(key).catch(() => {});
      }
    };

    if (shouldAutoPlay) {
      audio.addEventListener("canplay", tryPlay);
    }

    let cancelled = false;
    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ startPosition: -1 });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error(
            `[SharedBackgroundMusic:${key}] HLS error:`,
            data.type,
            data.details,
          );
        });
        if (shouldAutoPlay) {
          hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        }
        hls.loadSource(url);
        hls.attachMedia(audio);
      } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
        audio.src = url;
      }
    })();

    const cleanupAutoplay = shouldAutoPlay ? ensureAutoplay(key) : () => {};
    readyRef.current = true;
    if (shouldAutoPlay) {
      tryPlay();
    }

    const govId = `bg:${key}`;
    const offGov = soundGovernor.register({
      id: govId,
      kind: "background",
      priority: 5,
      isPlaying: () => {
        if (!audioRef.current) return false;
        return !audioRef.current.paused && audioRef.current.volume > 0;
      },
      pause: () => {
        audioManager.pause(key);
      },
    });

    const onPlay = () => {
      soundGovernor.notePlaying(govId);
    };
    const onPause = () => {
      soundGovernor.noteStopped(govId);
    };
    const onVolumeChange = () => {
      if (audio.muted || audio.volume === 0) {
        soundGovernor.noteStopped(govId);
      } else if (!audio.paused) {
        soundGovernor.notePlaying(govId);
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("volumechange", onVolumeChange);

    return () => {
      audio.removeEventListener("error", onAudioError);
      audio.removeEventListener("canplay", tryPlay);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("volumechange", onVolumeChange);

      cancelled = true;
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      cleanupAutoplay();
      readyRef.current = false;
      audioManager.stop(key);
      try {
        audioManager.unregister(key);
      } catch {}
      offGov();
      purge(audioRef.current);
      audioRef.current = null;
    };
  }, [key, url, volume, shouldAutoPlay]);

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioManager.isSourceActive(key)) {
        userEnabledRef.current = false;
        audioManager.pause(key);
        setIsMuted(true);
      } else {
        userEnabledRef.current = true;
        audioManager.play(key).catch(() => {});
        setIsMuted(false);
      }
    }
  };

  return { isMuted, toggleMute };
}
