/**
 * src/features/liquid-glass/SunAlbumsStage.tsx
 *
 * Full-page Sun Albums Experience directly over the current background:
 *  - Single Shared 1:1 Glass Square Blueprint (<symbol id="lg-shared-glass-1x1"> + <use>)
 *    instantiated across all 99 albums so the browser reuses one master glass resource.
 *  - Dynamic cover-color specular glow (--album-rgb) extracted once per cover via tiny 6x6
 *    offscreen sampling and cached in memory (with instant deterministic fallback).
 *  - Responsive Grid:
 *      • Desktop / PC: 8 squares per row × 4 visible rows (scrollable to view all 99 albums)
 *      • Phone / Mobile: 4 squares per row × 6 visible rows (scrollable to view all 99 albums)
 *      • Dynamically resizes and repositions on window resize or device rotation.
 *  - Fast sequential staggered entrance (fraction-of-a-second delay between each square).
 *  - Clicking an album smoothly hides all other squares, ascends the selected album cover
 *    to the top, and reveals numbered Liquid Glass Track Tubes below it.
 *  - Clicking a track tube expands it and streams the track's HLS (.m3u8) audio with a
 *    Liquid Glass Capillary Progress Bar (flowing liquid fill), tabular time readout,
 *    automatic background lyrics fetching via `nl music` (`fetchLyrics`), and a button
 *    that opens a side-by-side Liquid Glass Synced Lyrics Window.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Languages,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type Hls from 'hls.js';
import {
  fetchLyrics,
  getCachedLyrics,
  type LyricsResult,
} from '../music/data/lyrics';
import {
  LIQUID_GLASS_ALBUMS,
  type LiquidGlassAlbum,
  type LiquidGlassTrack,
} from './albumsData';

// ============================================================================
// Lightweight Cover Color Cache (Samples a tiny 6x6 canvas once per cover)
// ============================================================================
const coverRgbCache = new Map<string, string>();

const FALLBACK_PALETTE: readonly string[] = [
  '255, 168, 76',
  '120, 214, 255',
  '244, 114, 182',
  '167, 139, 250',
  '52, 211, 153',
  '251, 146, 60',
  '96, 165, 250',
  '248, 113, 113',
  '232, 121, 249',
  '45, 212, 191',
];

function getInitialAlbumRgb(index: number): string {
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

let sharedSamplerCanvas: HTMLCanvasElement | null = null;
let sharedSamplerCtx: CanvasRenderingContext2D | null = null;

function extractCoverRgbFromImage(img: HTMLImageElement, albumId: string): string | null {
  const cached = coverRgbCache.get(albumId);
  if (cached) return cached;

  try {
    if (!sharedSamplerCanvas) {
      sharedSamplerCanvas = document.createElement('canvas');
      sharedSamplerCanvas.width = 6;
      sharedSamplerCanvas.height = 6;
      sharedSamplerCtx = sharedSamplerCanvas.getContext('2d', {
        willReadFrequently: true,
      });
    }
    if (!sharedSamplerCtx) return null;

    sharedSamplerCtx.clearRect(0, 0, 6, 6);
    sharedSamplerCtx.drawImage(img, 0, 0, 6, 6);
    const data = sharedSamplerCtx.getImageData(0, 0, 6, 6).data;

    let bestR = 220;
    let bestG = 175;
    let bestB = 110;
    let bestScore = -1;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (max + min) * 0.5;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lum - 255) + 1);
      // Prefer vibrant mid-to-bright hues so glass sheen looks luminous
      const lumWeight = lum > 35 && lum < 235 ? 1.25 : 0.45;
      const score = sat * lumWeight * (max / 255);
      if (score > bestScore) {
        bestScore = score;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }

    // Boost brightness slightly so dark covers still produce a visible crystal glow
    const boost = Math.max(1, 165 / Math.max(bestR, bestG, bestB, 65));
    const finalR = Math.min(255, Math.round(bestR * boost));
    const finalG = Math.min(255, Math.round(bestG * boost));
    const finalB = Math.min(255, Math.round(bestB * boost));
    const rgb = `${finalR}, ${finalG}, ${finalB}`;
    coverRgbCache.set(albumId, rgb);
    return rgb;
  } catch {
    return null;
  }
}

function formatTrackTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// Single Shared Glass Blueprint (1 Master SVG Resource Cloned via <use>)
// ============================================================================
const SharedGlassBlueprintSvg = React.memo(function SharedGlassBlueprintSvg() {
  return (
    <svg
      className="lg-shared-glass-defs"
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lg-glass-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.92)" />
          <stop offset="28%" stopColor="rgba(255, 255, 255, 0.28)" />
          <stop offset="65%" stopColor="rgba(255, 255, 255, 0.08)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.68)" />
        </linearGradient>

        <linearGradient id="lg-glass-sheen-grad" x1="12%" y1="0%" x2="88%" y2="75%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.52)" />
          <stop offset="32%" stopColor="rgba(255, 255, 255, 0.14)" />
          <stop offset="58%" stopColor="rgba(255, 255, 255, 0.0)" />
        </linearGradient>

        <radialGradient id="lg-glass-corner-spec" cx="22%" cy="16%" r="58%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.46)" />
          <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.0)" />
        </radialGradient>

        {/* Master 1:1 Luxury Liquid Glass Square Geometry — Instantiated 99x via <use> */}
        <symbol id="lg-shared-glass-1x1" viewBox="0 0 100 100">
          {/* Top-left liquid meniscus specular dome */}
          <rect
            x="1.5"
            y="1.5"
            width="97"
            height="97"
            rx="18"
            ry="18"
            fill="url(#lg-glass-corner-spec)"
          />
          {/* Diagonal crystal glass sheen */}
          <path
            d="M 8 2 H 78 A 18 18 0 0 1 98 20 V 42 Q 52 54 2 68 V 20 A 18 18 0 0 1 20 2 Z"
            fill="url(#lg-glass-sheen-grad)"
          />
          {/* Outer refractive crystal rim */}
          <rect
            x="0.8"
            y="0.8"
            width="98.4"
            height="98.4"
            rx="18.5"
            ry="18.5"
            fill="none"
            stroke="url(#lg-glass-rim-grad)"
            strokeWidth="1.5"
          />
          {/* Inner capillary highlight ring */}
          <rect
            x="2.6"
            y="2.6"
            width="94.8"
            height="94.8"
            rx="16.6"
            ry="16.6"
            fill="none"
            stroke="rgba(255, 255, 255, 0.24)"
            strokeWidth="0.7"
          />
        </symbol>
      </defs>
    </svg>
  );
});

// ============================================================================
// Memoized Single Album 1:1 Glass Tile (Reuses #lg-shared-glass-1x1)
// ============================================================================
interface AlbumGlassTileProps {
  album: LiquidGlassAlbum;
  staggerIndex: number;
  onSelect: (album: LiquidGlassAlbum) => void;
}

const AlbumGlassTile = React.memo(function AlbumGlassTile({
  album,
  staggerIndex,
  onSelect,
}: AlbumGlassTileProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const initialRgb = useMemo(
    () => coverRgbCache.get(album.id) ?? getInitialAlbumRgb(album.index),
    [album.id, album.index],
  );

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const runSample = () => {
        const rgb = extractCoverRgbFromImage(img, album.id);
        if (rgb && buttonRef.current) {
          buttonRef.current.style.setProperty('--album-rgb', rgb);
        }
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (
          window as Window & {
            requestIdleCallback: (cb: () => void) => number;
          }
        ).requestIdleCallback(runSample);
      } else {
        setTimeout(runSample, 16);
      }
    },
    [album.id],
  );

  // Fast sequential fraction-of-a-second stagger (18ms step for visible rows, tighter for deeper scroll)
  const delayMs =
    staggerIndex < 32
      ? staggerIndex * 22
      : 32 * 22 + Math.min(staggerIndex - 32, 40) * 10;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="lg-album-cell"
      onClick={() => onSelect(album)}
      style={
        {
          '--album-rgb': initialRgb,
          '--tile-delay': `${delayMs}ms`,
        } as React.CSSProperties
      }
      aria-label={`${album.title} - ${album.artist}`}
    >
      <div className="lg-album-square">
        {/* Color-reactive ambient glass aura behind cover */}
        <span className="lg-album-square__aura" aria-hidden="true" />

        {/* Album Cover Artwork */}
        <img
          src={album.coverUrl}
          alt={album.title}
          className="lg-album-square__img"
          loading={staggerIndex < 32 ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={handleImageLoad}
        />

        {/* Color-tinted specular reflection overlay */}
        <span className="lg-album-square__color-sheen" aria-hidden="true" />

        {/* Cloned Single Glass Blueprint Instance (<use>) */}
        <svg className="lg-album-square__glass-svg" aria-hidden="true">
          <use href="#lg-shared-glass-1x1" />
        </svg>
      </div>

      <span className="lg-album-title" title={album.title}>
        {album.title}
      </span>
    </button>
  );
});

// ============================================================================
// Main SunAlbumsStage Component
// ============================================================================
export interface SunAlbumsStageProps {
  viewportWidth: number;
  viewportHeight: number;
  externalMuted: boolean;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  onBackToOrbs: () => void;
}

export const SunAlbumsStage = React.memo(function SunAlbumsStage({
  viewportWidth,
  viewportHeight,
  externalMuted,
  onToggleMute,
  onAudioActiveChange,
  onAudioElementMount,
  onBackToOrbs,
}: SunAlbumsStageProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<LiquidGlassAlbum | null>(null);
  const [isGridExiting, setIsGridExiting] = useState(false);

  // Active track & audio playback state
  const [activeTrack, setActiveTrack] = useState<LiquidGlassTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Lyrics / Translation state (via `nl music` lyrics engine)
  const [lyricsData, setLyricsData] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsWindowOpen, setLyricsWindowOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);
  const activeLyricLineRef = useRef<HTMLButtonElement | null>(null);

  // ── Dynamic Responsive Grid Math: 8x4 on PC, 4x6 on Phone ────────────────
  const gridMetrics = useMemo(() => {
    const isPhone =
      viewportWidth <= 768 ||
      (viewportWidth < 900 && viewportHeight > viewportWidth * 1.05);
    const cols = isPhone ? 4 : 8;
    const visibleRows = isPhone ? 6 : 4;

    const colGap = isPhone
      ? Math.max(8, Math.min(Math.round(viewportWidth * 0.024), 14))
      : Math.max(14, Math.min(Math.round(viewportWidth * 0.015), 24));
    const rowGap = isPhone ? 10 : 14;
    const titleHeight = isPhone ? 26 : 30;

    // Top/bottom padding reserves space for top navigation controls
    const padTop = isPhone ? 64 : 68;
    const padBottom = isPhone ? 20 : 28;
    const padSide = isPhone ? 14 : 36;

    const availW = Math.max(viewportWidth - padSide * 2, 260);
    const availH = Math.max(viewportHeight - padTop - padBottom, 320);

    // Compute exact 1:1 square size so `cols` fit horizontally AND `visibleRows` fit vertically
    const maxTileW = Math.floor((availW - (cols - 1) * colGap) / cols);
    const maxTileH = Math.floor(
      (availH - (visibleRows - 1) * rowGap) / visibleRows - titleHeight,
    );

    const tileSize = Math.max(
      isPhone ? 52 : 68,
      Math.min(maxTileW, maxTileH, isPhone ? 115 : 148),
    );

    const containerWidth = cols * tileSize + (cols - 1) * colGap;
    const viewportRowsHeight =
      visibleRows * (tileSize + titleHeight) + (visibleRows - 1) * rowGap;

    return {
      isPhone,
      cols,
      visibleRows,
      colGap,
      rowGap,
      titleHeight,
      tileSize,
      containerWidth,
      viewportRowsHeight,
    };
  }, [viewportWidth, viewportHeight]);

  // ── Register shared <audio> element with NL audioManager ─────────────────
  useEffect(() => {
    const audio = audioRef.current;
    onAudioElementMount?.(audio);
    return () => {
      onAudioElementMount?.(null);
      onAudioActiveChange?.(false);
    };
  }, [onAudioElementMount, onAudioActiveChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  // ── Handle Album Selection (Smooth grid exit -> Album cover ascends) ─────
  const handleSelectAlbum = useCallback((album: LiquidGlassAlbum) => {
    setIsGridExiting(true);
    setTimeout(() => {
      setSelectedAlbum(album);
      setIsGridExiting(false);
      setActiveTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setLyricsData(null);
      setLyricsWindowOpen(false);
    }, 220);
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (selectedAlbum) {
      // Stop active track & return to 99-albums grid
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      onAudioActiveChange?.(false);
      setActiveTrack(null);
      setIsPlaying(false);
      setLyricsWindowOpen(false);
      setSelectedAlbum(null);
    } else {
      onBackToOrbs();
    }
  }, [selectedAlbum, onBackToOrbs, onAudioActiveChange]);

  // ── Escape key support inside Sun Albums Stage ───────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAlbum) {
        e.stopPropagation();
        e.preventDefault();
        handleBackNavigation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedAlbum, handleBackNavigation]);

  // ── Singleton HLS (.m3u8) Audio Streaming for Selected Track Tube ────────
  useEffect(() => {
    if (!selectedAlbum || !activeTrack) return undefined;
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
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsBuffering(false);
    };

    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onAudioActiveChange?.(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    const onEnded = () => {
      setIsPlaying(false);
      // Auto-advance to next track in the album if available
      const idx = selectedAlbum.tracks.findIndex((t) => t.num === activeTrack.num);
      if (idx >= 0 && idx + 1 < selectedAlbum.tracks.length) {
        setActiveTrack(selectedAlbum.tracks[idx + 1]);
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
      audio.play().catch(() => {
        setIsPlaying(false);
      });
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

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          startPlayback();
        });

        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
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
  }, [selectedAlbum, activeTrack, externalMuted, onAudioActiveChange]);

  // ── Automatic Background Lyrics Fetching via `nl music` (`fetchLyrics`) ──
  useEffect(() => {
    let alive = true;
    if (!selectedAlbum || !activeTrack) {
      setLyricsData(null);
      setLyricsLoading(false);
      return undefined;
    }

    const trackKey = `${selectedAlbum.id}_track_${activeTrack.num}`;
    const cached = getCachedLyrics(trackKey);
    if (cached !== undefined) {
      setLyricsData(cached);
      setLyricsLoading(false);
      return undefined;
    }

    setLyricsLoading(true);
    // Clean primary artist name for accurate LRCLIB matching
    const primaryArtist = selectedAlbum.artist
      .split(/[,;&]/)[0]
      .trim();

    fetchLyrics({
      id: trackKey,
      title: activeTrack.title,
      artist: primaryArtist,
      album: selectedAlbum.title,
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
  }, [selectedAlbum, activeTrack]);

  // ── Active Synced Lyric Index Calculation ────────────────────────────────
  const lyricLines = lyricsData?.lines ?? [];
  const isSyncedLyrics = Boolean(lyricsData?.synced) && lyricLines.length > 0;

  const activeLyricIndex = useMemo(() => {
    if (!isSyncedLyrics || lyricLines.length === 0) return 0;
    let idx = 0;
    for (let i = 0; i < lyricLines.length; i++) {
      if (currentTime >= lyricLines[i].t) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [isSyncedLyrics, lyricLines, currentTime]);

  // Smoothly keep the active synced lyric line centered in the side glass window
  useEffect(() => {
    if (!lyricsWindowOpen || !isSyncedLyrics) return;
    activeLyricLineRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeLyricIndex, lyricsWindowOpen, isSyncedLyrics]);

  // ── Track Tube Controls & Capillary Progress Bar Scrubbing ───────────────
  const handleTrackTubeClick = useCallback(
    (track: LiquidGlassTrack) => {
      if (activeTrack?.num === track.num) {
        // Toggle play/pause if clicking play area, or keep expanded
        const a = audioRef.current;
        if (!a) return;
        if (a.paused || a.ended) {
          void a.play().catch(() => {});
        } else {
          a.pause();
        }
      } else {
        setActiveTrack(track);
      }
    },
    [activeTrack],
  );

  const toggleAudioPlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (a.paused || a.ended) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, []);

  const seekAudioToSec = useCallback(
    (sec: number) => {
      const a = audioRef.current;
      if (!a || !Number.isFinite(duration) || duration <= 0) return;
      const clamped = Math.min(Math.max(sec, 0), duration);
      a.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration],
  );

  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      if (!bar || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(
        Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0),
        1,
      );
      seekAudioToSec(ratio * duration);
    },
    [duration, seekAudioToSec],
  );

  const handleAudioSeekDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleAudioSeekMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleAudioSeekUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  const selectedAlbumRgb = selectedAlbum
    ? coverRgbCache.get(selectedAlbum.id) ?? getInitialAlbumRgb(selectedAlbum.index)
    : '255, 168, 76';

  return (
    <div
      className="lg-sun-fullstage"
      style={
        {
          '--lg-grid-cols': String(gridMetrics.cols),
          '--lg-tile-size': `${gridMetrics.tileSize}px`,
          '--lg-col-gap': `${gridMetrics.colGap}px`,
          '--lg-row-gap': `${gridMetrics.rowGap}px`,
          '--lg-title-h': `${gridMetrics.titleHeight}px`,
          '--lg-grid-w': `${gridMetrics.containerWidth}px`,
          '--lg-grid-vh': `${gridMetrics.viewportRowsHeight}px`,
          '--selected-album-rgb': selectedAlbumRgb,
        } as React.CSSProperties
      }
    >
      {/* Single Master SVG Glass Blueprint */}
      <SharedGlassBlueprintSvg />

      {/* Hidden Singleton HLS <audio> Element */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {/* Contextual Back Button (Returns from Selected Album -> 99 Grid, or Grid -> Orbs) */}
      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={handleBackNavigation}
        aria-label={selectedAlbum ? 'العودة إلى شبكة الألبومات' : 'العودة إلى كوكب الأرض والشمس'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {/* ====================================================================
       * VIEW 1: 99 ALBUMS FULL-PAGE RESPONSIVE GRID (8x4 PC / 4x6 Phone)
       * ==================================================================== */}
      {!selectedAlbum && (
        <div
          className={`lg-albums-scroll-viewport${
            isGridExiting ? ' lg-albums-scroll-viewport--exiting' : ''
          }`}
        >
          <div className="lg-albums-grid" role="list" aria-label="قائمة الألبومات">
            {LIQUID_GLASS_ALBUMS.map((album, idx) => (
              <AlbumGlassTile
                key={album.id}
                album={album}
                staggerIndex={idx}
                onSelect={handleSelectAlbum}
              />
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
       * VIEW 2: SELECTED ALBUM (Ascended Cover + Track Tubes + Side Lyrics)
       * ==================================================================== */}
      {selectedAlbum && (
        <div
          className={`lg-album-detail-workspace${
            lyricsWindowOpen && activeTrack ? ' lg-album-detail-workspace--with-lyrics' : ''
          }`}
        >
          {/* Main Column: Ascended Album Cover at Top + Expandable Track Tubes Below */}
          <div className="lg-album-player-column">
            {/* Ascended Album Cover Hero */}
            <header className="lg-ascended-album-hero">
              <div className="lg-ascended-album-cover">
                <span className="lg-album-square__aura" aria-hidden="true" />
                <img
                  src={selectedAlbum.coverUrl}
                  alt={selectedAlbum.title}
                  className="lg-album-square__img"
                  decoding="async"
                  draggable={false}
                />
                <span className="lg-album-square__color-sheen" aria-hidden="true" />
                <svg className="lg-album-square__glass-svg" aria-hidden="true">
                  <use href="#lg-shared-glass-1x1" />
                </svg>
              </div>

              <div className="lg-ascended-album-meta">
                <h1 className="lg-ascended-album-title">{selectedAlbum.title}</h1>
                <p className="lg-ascended-album-artist">{selectedAlbum.artist}</p>
              </div>
            </header>

            {/* Scrollable List of Liquid Glass Track Tubes / Windows */}
            <div
              className="lg-track-tubes-list"
              role="list"
              aria-label={`أغاني ألبوم ${selectedAlbum.title}`}
            >
              {selectedAlbum.tracks.map((track, idx) => {
                const isExpanded = activeTrack?.num === track.num;
                const trackNumFormatted = String(track.num).padStart(2, '0');
                const hasLyricsReady =
                  isExpanded && Boolean(lyricsData && lyricsData.lines.length > 0);

                return (
                  <div
                    key={track.num}
                    role="listitem"
                    className={`lg-track-tube${
                      isExpanded ? ' lg-track-tube--expanded' : ''
                    }`}
                    style={
                      {
                        '--tube-delay': `${Math.min(idx * 24, 360)}ms`,
                      } as React.CSSProperties
                    }
                    onClick={() => {
                      if (!isExpanded) {
                        handleTrackTubeClick(track);
                      }
                    }}
                  >
                    {/* Top Row of Tube: Number + Song Title + (When Expanded: Controls, Time, Lyrics Button) */}
                    <div className="lg-track-tube__header">
                      {isExpanded ? (
                        <button
                          type="button"
                          className="lg-tube-play-btn"
                          onClick={toggleAudioPlayPause}
                          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                        >
                          {isBuffering ? (
                            <span className="lg-tube-mini-spinner" aria-hidden="true" />
                          ) : isPlaying ? (
                            <Pause size={15} fill="currentColor" />
                          ) : (
                            <Play size={15} fill="currentColor" />
                          )}
                        </button>
                      ) : (
                        <span className="lg-track-tube__num">{trackNumFormatted}</span>
                      )}

                      <div
                        className="lg-track-tube__title-wrap"
                        onClick={() => handleTrackTubeClick(track)}
                      >
                        {isExpanded && (
                          <span className="lg-track-tube__num lg-track-tube__num--inline">
                            {trackNumFormatted}
                          </span>
                        )}
                        <span className="lg-track-tube__title">{track.title}</span>
                      </div>

                      {isExpanded && (
                        <div
                          className="lg-track-tube__actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="lg-tube-time-readout">
                            {formatTrackTime(currentTime)} / {formatTrackTime(duration)}
                          </span>

                          <button
                            type="button"
                            className="lg-tube-icon-btn"
                            onClick={onToggleMute}
                            aria-label={externalMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                          >
                            {externalMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>

                          {/* Small Lyrics / Translation Button (Auto-prefetched on track play) */}
                          <button
                            type="button"
                            className={`lg-tube-lyrics-btn${
                              lyricsWindowOpen ? ' lg-tube-lyrics-btn--active' : ''
                            }${hasLyricsReady ? ' lg-tube-lyrics-btn--ready' : ''}`}
                            onClick={() => setLyricsWindowOpen((open) => !open)}
                            title="عرض الكلمات / الترجمة المتزامنة"
                            aria-label="نافذة الكلمات المتزامنة"
                            aria-pressed={lyricsWindowOpen}
                          >
                            <Languages size={14} strokeWidth={2.2} />
                            <span>الكلمات</span>
                            {lyricsLoading && (
                              <span className="lg-tube-lyrics-dot" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded Capillary Liquid Progress Tube */}
                    {isExpanded && (
                      <div
                        className="lg-track-tube__player-body"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          ref={seekBarRef}
                          className="lg-seek-hit lg-tube-seek-hit"
                          role="slider"
                          tabIndex={0}
                          aria-label="تقديم أو ترجيع الأغنية"
                          aria-valuemin={0}
                          aria-valuemax={Math.round(duration || 0)}
                          aria-valuenow={Math.round(currentTime || 0)}
                          onPointerDown={handleAudioSeekDown}
                          onPointerMove={handleAudioSeekMove}
                          onPointerUp={handleAudioSeekUp}
                          onPointerCancel={handleAudioSeekUp}
                        >
                          <div className="lg-seek-track lg-tube-seek-track">
                            <div
                              className="lg-seek-fill lg-tube-seek-fill"
                              style={{ width: `${progressPercent}%` }}
                            >
                              <span
                                className="lg-seek-fill__wave"
                                aria-hidden="true"
                              />
                            </div>
                            <div
                              className="lg-seek-thumb lg-tube-seek-thumb"
                              style={{ left: `${progressPercent}%` }}
                            />
                            <div
                              className="lg-seek-tube-gloss"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Liquid Glass Synced Lyrics Window (`nl music` Lyrics Engine) */}
          {lyricsWindowOpen && activeTrack && (
            <aside
              className="lg-lyrics-glass-window"
              aria-label={`كلمات أغنية ${activeTrack.title}`}
            >
              <div className="lg-lyrics-glass-window__header">
                <div className="lg-lyrics-glass-window__title-group">
                  <Sparkles size={15} className="lg-lyrics-sparkle" />
                  <div className="lg-lyrics-glass-window__meta">
                    <span className="lg-lyrics-glass-window__song">
                      {activeTrack.title}
                    </span>
                    <span className="lg-lyrics-glass-window__artist">
                      {selectedAlbum.artist}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="lg-tube-icon-btn"
                  onClick={() => setLyricsWindowOpen(false)}
                  aria-label="إغلاق نافذة الكلمات"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="lg-lyrics-glass-window__body">
                {lyricsLoading ? (
                  <div className="lg-lyrics-status">
                    <span className="lg-tube-mini-spinner" aria-hidden="true" />
                    <span>جاري مزامنة الكلمات...</span>
                  </div>
                ) : lyricLines.length === 0 ? (
                  <div className="lg-lyrics-status">
                    <span>لا تتوفر كلمات متزامنة لهذه المقطوعة</span>
                  </div>
                ) : isSyncedLyrics ? (
                  <div className="lg-lyrics-synced-stage">
                    {/* 3-Line Spotlight Stage (Prev / Active / Next) + Full Scrollable Synced Stream */}
                    <div className="lg-lyrics-scroll-list">
                      {lyricLines.map((line, i) => {
                        const isCurrent = i === activeLyricIndex;
                        const isPassed = i < activeLyricIndex;
                        return (
                          <button
                            key={`${i}-${line.t}`}
                            ref={isCurrent ? activeLyricLineRef : null}
                            type="button"
                            onClick={() => seekAudioToSec(line.t)}
                            className={`lg-lyric-line${
                              isCurrent
                                ? ' lg-lyric-line--active'
                                : isPassed
                                  ? ' lg-lyric-line--passed'
                                  : ''
                            }`}
                          >
                            {line.text}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="lg-lyrics-plain-scroll">
                    {lyricLines.map((line, i) => (
                      <p key={i} className="lg-lyric-plain-line">
                        {line.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
});
