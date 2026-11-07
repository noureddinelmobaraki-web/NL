/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/useAlbumAudioPlayer.ts
 *
 * HLS audio playback lifecycle, YouTube background verification,
 * droplet wobble animation, and synced lyrics state for AlbumPlayerWorkspace.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { nowPlayingBus } from '../../../../audio/nowPlayingBus';
import { fetchLyrics, getCachedLyrics, type LyricsResult } from '../../../music/data/lyrics';
import type { LiquidGlassAlbum, LiquidGlassTrack } from '../../albumsData';
import { getTrackYoutubeVideoId } from '../../albumsYoutubeCatalog';

interface UseAlbumAudioPlayerOptions {
  album: LiquidGlassAlbum;
  externalMuted: boolean;
  lowPower: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  ascendedCoverRef: React.RefObject<HTMLDivElement | null>;
  onAudioActiveChange?: (active: boolean) => void;
}

export function useAlbumAudioPlayer({
  album,
  externalMuted,
  lowPower,
  audioRef,
  ascendedCoverRef,
  onAudioActiveChange,
}: UseAlbumAudioPlayerOptions) {
  const [activeTrack, setActiveTrack] = useState<LiquidGlassTrack | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [ytBgEnabled, setYtBgEnabled] = useState(true);
  const [ytVideoVerifiedPlaying, setYtVideoVerifiedPlaying] = useState(false);
  const [ytVideoFailed, setYtVideoFailed] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsWindowOpen, setLyricsWindowOpen] = useState(false);

  const hlsRef = useRef<Hls | null>(null);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    if (lowPower) return undefined;
    let rafId = 0;
    const t0 = performance.now();
    const animateDroplet = (now: number) => {
      const elapsed = (now - t0) * 0.001;
      if (ascendedCoverRef.current) {
        const r1 = 28 + Math.sin(elapsed * 1.45) * 6 + Math.cos(elapsed * 0.75) * 2.5;
        const r2 = 28 + Math.cos(elapsed * 1.3) * 6 + Math.sin(elapsed * 0.9) * 2.5;
        const r3 = 28 + Math.sin(elapsed * 1.55 + 1.2) * 6;
        const r4 = 28 + Math.cos(elapsed * 1.2 + 2.1) * 6;
        const r5 = 28 + Math.cos(elapsed * 1.35 + 0.6) * 6;
        const r6 = 28 + Math.sin(elapsed * 1.65 + 1.8) * 6;
        const r7 = 28 + Math.cos(elapsed * 1.45 + 2.7) * 6;
        const r8 = 28 + Math.sin(elapsed * 1.25 + 0.4) * 6;
        ascendedCoverRef.current.style.borderRadius = `${r1.toFixed(1)}% ${r2.toFixed(1)}% ${r3.toFixed(1)}% ${r4.toFixed(1)}% / ${r5.toFixed(1)}% ${r6.toFixed(1)}% ${r7.toFixed(1)}% ${r8.toFixed(1)}%`;
      }
      rafId = requestAnimationFrame(animateDroplet);
    };
    rafId = requestAnimationFrame(animateDroplet);
    return () => cancelAnimationFrame(rafId);
  }, [lowPower, ascendedCoverRef]);

  const activeYoutubeVideoId = useMemo(() => {
    if (!activeTrack) return null;
    return getTrackYoutubeVideoId(album.id, activeTrack.num);
  }, [album.id, activeTrack]);

  useEffect(() => {
    setYtVideoVerifiedPlaying(false);
    setYtVideoFailed(false);

    if (!activeTrack || !ytBgEnabled || !activeYoutubeVideoId || lowPower) {
      return undefined;
    }

    let cancelled = false;
    fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
        activeYoutubeVideoId,
      )}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('oembed failed');
        return res.json();
      })
      .then((data: { error?: string; title?: string }) => {
        if (cancelled) return;
        if (data.error || !data.title) setYtVideoFailed(true);
      })
      .catch(() => {});

    const onMessage = (event: MessageEvent) => {
      if (cancelled || typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data) as {
          event?: string;
          info?: number | { playerState?: number; videoData?: { isPlayable?: boolean } };
        };
        if (msg.event === 'onError') {
          setYtVideoFailed(true);
          setYtVideoVerifiedPlaying(false);
        } else if (msg.event === 'onStateChange' && msg.info === 1) {
          setYtVideoVerifiedPlaying(true);
        } else if (msg.event === 'infoDelivery' && msg.info && typeof msg.info === 'object') {
          if (msg.info.videoData?.isPlayable === false) {
            setYtVideoFailed(true);
            setYtVideoVerifiedPlaying(false);
          } else if (msg.info.playerState === 1) {
            setYtVideoVerifiedPlaying(true);
          }
        }
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
  }, [activeTrack, ytBgEnabled, activeYoutubeVideoId, lowPower]);

  const handleYtIframeLoad = useCallback(() => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeTrack) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    let cancelled = false;
    const destroyHls = () => {
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
    };

    destroyHls();
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    audio.muted = externalMuted;

    const onLoadedMetadata = () => {
      if (cancelled) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
      setIsBuffering(false);
    };
    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) setCurrentTime(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onAudioActiveChange?.(true);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onEnded = () => {
      setIsPlaying(false);
      const idx = album.tracks.findIndex((t) => t.num === activeTrack.num);
      if (idx >= 0 && idx + 1 < album.tracks.length) {
        setActiveTrack(album.tracks[idx + 1]);
      } else {
        onAudioActiveChange?.(false);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);

    const startPlayback = () => {
      if (cancelled) return;
      audio.play().catch(() => setIsPlaying(false));
    };

    void (async () => {
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;
      if (HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          startPosition: 0,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
        });
        hlsRef.current = hls;
        hls.on(HlsLib.Events.MANIFEST_PARSED, startPlayback);
        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            destroyHls();
            setIsBuffering(false);
          }
        });
        hls.loadSource(activeTrack.url);
        hls.attachMedia(audio);
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = activeTrack.url;
        audio.addEventListener('loadedmetadata', startPlayback, { once: true });
      }
    })();

    return () => {
      cancelled = true;
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      destroyHls();
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        /* ignore */
      }
    };
  }, [album, activeTrack, externalMuted, audioRef, onAudioActiveChange]);

  useEffect(() => {
    let alive = true;
    if (!activeTrack) {
      setLyricsData(null);
      setLyricsLoading(false);
      return undefined;
    }

    const trackKey = `${album.id}_track_${activeTrack.num}`;
    const cached = getCachedLyrics(trackKey);
    if (cached !== undefined) {
      setLyricsData(cached);
      setLyricsLoading(false);
      return undefined;
    }

    setLyricsLoading(true);
    const primaryArtist = album.artist.split(/[,;&]/)[0].trim();

    fetchLyrics({
      id: trackKey,
      title: activeTrack.title,
      artist: primaryArtist,
      album: album.title,
    })
      .then((res) => {
        if (alive) setLyricsData(res);
      })
      .catch(() => {
        if (alive) setLyricsData(null);
      })
      .finally(() => {
        if (alive) setLyricsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [album, activeTrack]);

  const lyricLines = lyricsData?.lines ?? [];
  const isSyncedLyrics = Boolean(lyricsData?.synced) && lyricLines.length > 0;

  const activeLyricIndex = useMemo(() => {
    if (lyricLines.length === 0) return 0;
    if (!isSyncedLyrics) {
      if (duration > 0) {
        return Math.min(
          lyricLines.length - 1,
          Math.floor((currentTime / duration) * lyricLines.length),
        );
      }
      return 0;
    }
    let idx = 0;
    for (let i = 0; i < lyricLines.length; i++) {
      if (currentTime >= lyricLines[i].t) idx = i;
      else break;
    }
    return idx;
  }, [isSyncedLyrics, lyricLines, currentTime, duration]);

  const lineKaraokeRatio = useMemo(() => {
    if (lyricLines.length === 0 || !isSyncedLyrics) return 0.5;
    const currentLine = lyricLines[activeLyricIndex];
    const nextLine = lyricLines[activeLyricIndex + 1];
    if (!currentLine) return 0.5;
    const startT = currentLine.t;
    const endT = nextLine ? nextLine.t : Math.max(startT + 4, duration);
    const span = Math.max(endT - startT, 0.4);
    return Math.min(Math.max((currentTime - startT) / span, 0), 1);
  }, [lyricLines, isSyncedLyrics, activeLyricIndex, currentTime, duration]);

  useEffect(() => {
    if (!activeTrack) {
      nowPlayingBus.clear('album');
      return undefined;
    }
    nowPlayingBus.publish({
      source: 'album',
      title: activeTrack.title,
      subtitle: `${album.artist} • ${album.title}`,
      artworkUrl: album.coverUrl,
      accent: '#FF9F0A',
      isPlaying,
      canPrev: album.tracks.findIndex((t) => t.num === activeTrack.num) > 0,
      canNext:
        album.tracks.findIndex((t) => t.num === activeTrack.num) + 1 < album.tracks.length,
      controls: {
        toggle: () => {
          const el = audioRef.current;
          if (!el) return;
          if (el.paused) void el.play().catch(() => {});
          else el.pause();
        },
        prev: () => {
          const idx = album.tracks.findIndex((t) => t.num === activeTrack.num);
          if (idx > 0) setActiveTrack(album.tracks[idx - 1]);
        },
        next: () => {
          const idx = album.tracks.findIndex((t) => t.num === activeTrack.num);
          if (idx >= 0 && idx + 1 < album.tracks.length) setActiveTrack(album.tracks[idx + 1]);
        },
        stop: () => {
          audioRef.current?.pause();
          setActiveTrack(null);
          setIsPlaying(false);
          nowPlayingBus.clear('album');
        },
      },
    });
  }, [activeTrack, album, isPlaying, audioRef]);

  useEffect(() => {
    return () => {
      nowPlayingBus.clear('album');
    };
  }, []);

  return {
    activeTrack,
    setActiveTrack,
    isPlayerExpanded,
    setIsPlayerExpanded,
    isPlaying,
    isBuffering,
    currentTime,
    setCurrentTime,
    duration,
    ytBgEnabled,
    setYtBgEnabled,
    ytVideoVerifiedPlaying,
    ytVideoFailed,
    ytIframeRef,
    activeYoutubeVideoId,
    handleYtIframeLoad,
    lyricsData,
    lyricsLoading,
    lyricsWindowOpen,
    setLyricsWindowOpen,
    lyricLines,
    activeLyricIndex,
    lineKaraokeRatio,
    isScrubbingRef,
  };
}
