import { useEffect, useCallback, useMemo, useRef } from "react";
import { useSongPlayer } from "../../songs/SongPlayer";
import { savePrefs } from "../../../utils/userPrefs";
import type { RepeatMode } from "../../../utils/userPrefs";
import { loadSession } from "../../../utils/sessionState";
import { Song, ActiveSong, LyricLine } from "../../../types";
import { audioManager } from "../../../audio/audioManager";
import { nowPlayingBus } from "../../../audio/nowPlayingBus";
import { soundGovernor } from "../../../audio/soundGovernor";

export interface UseMySongsPlaybackProps {
  songs: Song[];
  activeId: number | null;
  setActiveId: (id: number | null) => void;
  currentSong: Song | null;
  volume: number;
  setVolume: (v: number) => void;
  lyricsOpen: boolean;
  isDismissed: boolean;
  setIsDismissed: (b: boolean) => void;
  isShuffle: boolean;
  setIsShuffle: (b: boolean | ((p: boolean) => boolean)) => void;
  repeatMode: RepeatMode;
  setRepeatMode: (m: RepeatMode | ((p: RepeatMode) => RepeatMode)) => void;
  lrcCache: Record<number, LyricLine[]>;
  onSongPlay: () => void;
  onSongStop?: () => void;
  onActiveSongChange: (data: ActiveSong | null) => void;
}

export function useMySongsPlayback({
  songs,
  activeId,
  setActiveId,
  currentSong,
  volume,
  setVolume,
  lyricsOpen,
  isDismissed,
  setIsDismissed,
  isShuffle,
  setIsShuffle,
  repeatMode,
  setRepeatMode,
  lrcCache,
  onSongPlay,
  onSongStop,
  onActiveSongChange,
}: UseMySongsPlaybackProps) {
  const {
    audioTagRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    pendingPlayRef,
    handlePlayPause,
    handleSeek,
  } = useSongPlayer({
    currentSong,
    onSongEnd: () => handleNext(),
    onTimeUpdate: () => {},
    onPlay: onSongPlay,
    onPause: () => onSongStop?.(),
    onNext: () => handleNext(),
    onPrev: () => handlePrev(),
  });

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const SWITCH_COOLDOWN_MS = 180;
  const lastSwitchAtRef = useRef(0);

  const handlePlayToggle = useCallback(
    (song?: Song) => {
      if (song && song.id !== activeId) {
        const now = performance.now();
        if (now - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS) return;
        lastSwitchAtRef.current = now;

        audioManager.stop("song");

        pendingPlayRef.current = true;
        setActiveId(song.id);
        setIsDismissed(false);
        onSongPlay();
        savePrefs({ lastSongId: song.id });
      } else {
        handlePlayPause();
      }
    },
    [
      activeId,
      handlePlayPause,
      onSongPlay,
      setActiveId,
      setIsDismissed,
      pendingPlayRef,
    ],
  );

  const handleNext = useCallback(() => {
    if (!songs.length) return;
    if (performance.now() - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS)
      return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let nIdx = isShuffle
      ? Math.floor(Math.random() * songs.length)
      : (idx + 1) % songs.length;
    if (isShuffle && nIdx === idx && songs.length > 1)
      nIdx = (nIdx + 1) % songs.length;
    handlePlayToggle(songs[nIdx]);
  }, [activeId, songs, isShuffle, handlePlayToggle]);

  const handlePrev = useCallback(() => {
    if (!songs.length) return;
    if (performance.now() - lastSwitchAtRef.current < SWITCH_COOLDOWN_MS)
      return;
    const idx = songs.findIndex((s) => s.id === activeId);
    let pIdx = isShuffle
      ? Math.floor(Math.random() * songs.length)
      : (idx - 1 + songs.length) % songs.length;
    if (isShuffle && pIdx === idx && songs.length > 1)
      pIdx = (pIdx - 1 + songs.length) % songs.length;
    handlePlayToggle(songs[pIdx]);
  }, [activeId, songs, isShuffle, handlePlayToggle]);

  // ── نشر الحالة إلى نوتش now-playing العالمي (الاسم الحقيقي + تحكّم مستقرّ) ──
  // مصدر audioManager لأغاني My Songs هو 'song'؛ النوتش يقرأ من nowPlayingBus فقط.
  const npCbRef = useRef({
    toggle: () => {},
    next: () => {},
    prev: () => {},
    stop: () => {},
  });
  npCbRef.current.toggle = () => handlePlayToggle();
  npCbRef.current.next = () => handleNext();
  npCbRef.current.prev = () => handlePrev();
  npCbRef.current.stop = () => {
    audioManager.stop("song");
    if (audioTagRef.current) {
      audioTagRef.current.pause();
      audioTagRef.current.src = "";
      audioTagRef.current.load();
    }
    setActiveId(null);
    setIsDismissed(true);
  };

  const npControlsRef = useRef({
    toggle: () => npCbRef.current.toggle(),
    next: () => npCbRef.current.next(),
    prev: () => npCbRef.current.prev(),
    stop: () => npCbRef.current.stop(),
  });

  useEffect(() => {
    if (isDismissed || !activeId || !currentSong) {
      nowPlayingBus.clear("song");
      return;
    }
    nowPlayingBus.publish({
      source: "song",
      title: currentSong.title,
      subtitle: "My Songs",
      artworkUrl: currentSong.cover || currentSong.backgroundImage,
      isPlaying,
      canNext: true,
      canPrev: true,
      controls: npControlsRef.current,
    });
  }, [activeId, currentSong, isPlaying, isDismissed]);

  useEffect(
    () => () => {
      nowPlayingBus.clear("song");
    },
    [],
  );

  // ── تسجيل My Songs كقناة "أغنية" في السلطة المركزية (soundGovernor) ─────────────────────────
  // My Songs يملك عنصر <audio> خاصّا ولا يمرّ عبر محرّك NL Music، لذلك كانت أغنيتان تعملان معًا.
  // تسجيله هنا يجعل الحاكم يوقِف NL Music تلقائيًا عند تشغيل أغنية من My Songs والعكس.
  const mySongsGovRef = useRef({
    isPlaying: false,
    label: "My Songs",
    volume: 1,
    pause: () => {},
    stop: () => {},
    setVolume: (_v: number) => {},
    getVolume: () => 1 as number,
  });
  mySongsGovRef.current.isPlaying = isPlaying && !isDismissed && !!activeId;
  mySongsGovRef.current.label = currentSong ? currentSong.title : "My Songs";
  mySongsGovRef.current.pause = () => {
    try {
      audioTagRef.current?.pause();
    } catch {
      /* noop */
    }
  };
  mySongsGovRef.current.stop = () => {
    try {
      npCbRef.current.stop();
    } catch {
      /* noop */
    }
  };
  mySongsGovRef.current.setVolume = (v: number) => {
    if (audioTagRef.current) {
      try {
        audioTagRef.current.volume = Math.max(0, Math.min(1, v));
      } catch {
        /* noop */
      }
    }
  };
  mySongsGovRef.current.getVolume = () =>
    audioTagRef.current ? audioTagRef.current.volume : 1;

  useEffect(() => {
    const off = soundGovernor.register({
      id: "my-songs",
      kind: "song",
      priority: 10,
      label: () => mySongsGovRef.current.label,
      isPlaying: () => mySongsGovRef.current.isPlaying,
      pause: () => mySongsGovRef.current.pause(),
      stop: () => mySongsGovRef.current.stop(),
      setVolume: (v) => mySongsGovRef.current.setVolume(v),
      getVolume: () => mySongsGovRef.current.getVolume(),
    });
    return off;
  }, []);

  // أبلِغ الحاكم بتغيّر حالة التشغيل → يفرض "أغنية واحدة فقط" ويكشف التعارض مع الخلفية.
  useEffect(() => {
    if (isPlaying && !isDismissed && activeId) {
      soundGovernor.notePlaying("my-songs");
    } else {
      soundGovernor.noteStopped("my-songs");
    }
  }, [isPlaying, isDismissed, activeId]);

  // Sync volume with physical player
  useEffect(() => {
    if (audioTagRef.current) {
      const safeVol = Math.max(0, Math.min(volume, 1));
      audioTagRef.current.volume = safeVol;
      savePrefs({ lastVolume: safeVol });
    }
  }, [volume, audioTagRef]);

  // Sync loop/repeat
  useEffect(() => {
    if (audioTagRef.current) audioTagRef.current.loop = repeatMode === "one";
  }, [repeatMode, audioTagRef]);

  // Current lyric line memoization
  const currentLyricLine = useMemo(() => {
    if (!activeId) return null;
    const sessionLrc = loadSession().lrcCache;
    const lines = sessionLrc[activeId] || lrcCache[activeId];
    if (!lines) return null;
    let line = null;
    for (const l of lines) {
      if (l.time <= currentTime) line = l.text;
      else break;
    }
    return line;
  }, [activeId, lrcCache, currentTime]);

  // Sync activeSong state with parent
  useEffect(() => {
    if (!isDismissed && activeId && currentSong) {
      onActiveSongChange({
        id: activeId,
        title: currentSong.title,
        cover: currentSong.cover || currentSong.backgroundImage,
        audioRef: { current: audioTagRef.current },
        isPlaying,
        get currentTime() {
          return currentTimeRef.current;
        },
        duration,
        onPlayPause: () => handlePlayToggle(),
        onPrev: handlePrev,
        onNext: handleNext,
        onDismiss: () => {
          audioManager.stop("song");
          if (audioTagRef.current) {
            audioTagRef.current.pause();
            audioTagRef.current.src = "";
            audioTagRef.current.load();
          }
          setActiveId(null);
          setIsDismissed(true);
        },
        suppressMiniBar: activeId !== null && lyricsOpen,
        isShuffle,
        onShuffleToggle: () =>
          setIsShuffle((p) => {
            savePrefs({ isShuffle: !p });
            return !p;
          }),
        repeatMode,
        onRepeatToggle: () =>
          setRepeatMode((prev) => {
            const next: RepeatMode =
              prev === "off" ? "all" : prev === "all" ? "one" : "off";
            savePrefs({ repeatMode: next });
            return next;
          }),
        volume,
        onVolumeChange: (v) => {
          setVolume(v);
          savePrefs({ lastVolume: v });
        },
        nextSongs: songs
          .slice(
            songs.findIndex((s) => s.id === activeId) + 1,
            songs.findIndex((s) => s.id === activeId) + 6,
          )
          .map((s) => ({
            id: s.id,
            title: s.title,
            cover: s.cover || s.backgroundImage,
          })),
      });
    } else {
      onActiveSongChange(null);
    }
  }, [
    activeId,
    isPlaying,
    duration,
    songs,
    isShuffle,
    repeatMode,
    volume,
    isDismissed,
    lyricsOpen,
    currentSong,
    onActiveSongChange,
    handlePrev,
    handleNext,
    handlePlayToggle,
    setActiveId,
    setIsDismissed,
    setIsShuffle,
    setRepeatMode,
    setVolume,
    audioTagRef,
  ]);

  // Share URL param parameter routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // نقرأ المعامل القانوني ?song= أولًا، مع دعم ?s= القديم للتوافق الخلفي
    const songId = params.get("song") ?? params.get("s");
    if (!songId || !songs.length) return;
    const parsedId = parseInt(songId, 10);
    if (Number.isNaN(parsedId)) return;
    const s = songs.find((x) => x.id === parsedId);
    if (!s) return;
    const t = setTimeout(() => {
      handlePlayToggle(s);
      document
        .getElementById("my-songs-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 1000);
    return () => clearTimeout(t);
  }, [songs, handlePlayToggle]);

  return {
    audioTagRef,
    isPlaying,
    currentTime,
    duration,
    audioStatus,
    currentLyricLine,
    handlePlayToggle,
    handlePrev,
    handleNext,
    handleSeek,
    handlePlayPause,
  };
}
