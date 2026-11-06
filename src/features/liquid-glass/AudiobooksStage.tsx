/**
 * src/features/liquid-glass/AudiobooksStage.tsx
 *
 * Pure Liquid Glass Audiobooks Stage & SunAlbumsStage-Inspired Player:
 *  - Mounts directly over the portal's responsive background image (no opaque dark/slate window).
 *  - 100% English UI with monochrome vector icons (zero emojis, zero source/provider clutter).
 *  - Streamlined Top Bar: 1 row on Desktop, 2 rows on Mobile — Search capsule, expandable Language
 *    branch pill (default: All Languages), and Genre chips with monochrome vector icons.
 *  - Every audiobook poster is framed by an ultra-thin luminous Liquid Glass rim (.lg-main-glass__caustic + .lg-main-glass__rim)
 *    with a separate floating Liquid Glass capsule (.lg-track-tube) underneath.
 *  - Split 50/50 Action Pill:
 *      • When both Audio & Readable editions exist: splits 50/50 into Royal Violet [Headphones · Listen]
 *        and Vibrant Emerald Green [Eye · Read].
 *      • When only Audio edition exists: full-width Royal Violet [Headphones · Listen].
 *  - Selected Audiobook Workspace uses the exact SunAlbumsStage architecture:
 *      1. Wobbling Liquid Glass Droplet Cover (.lg-ascended-album-cover--sun-bubble)
 *      2. Scrollable Clear Bubble Glass Chapter Tubes (.lg-track-tube + .lg-orb-capsule-caustic + .lg-orb-capsule-sheen)
 *      3. Expandable & Draggable Clear Bubble Glass Player Card (.lg-expanded-player-card) with Capillary Liquid Seek Bar
 *         (.lg-seek-track / .lg-tube-seek-fill / .lg-tube-seek-thumb), -15s/+15s skip, speed control, and auto-resume.
 *  - Smart Empty-Space Click: Player surround -> Catalog Grid -> 4 Orbs Stage.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  Eye,
  FastForward,
  Feather,
  Flame,
  Headphones,
  Landmark,
  Languages,
  Move,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  type AudiobookChapter,
  type AudiobookItem,
  type BookItem,
  fetchAudiobookChapters,
  fetchAudiobooksCatalog,
  fetchTrendingBooks,
  getBookArtisticPalette,
  getCachedAudiobooksCatalogSync,
  getInstantBookMatchForAudiobook,
  probeWrittenBookForAudiobook,
} from './booksAudioService';
import { getRandomAmbientVideoId } from './youtubeBackgrounds';

export interface AudiobooksStageProps {
  externalMuted: boolean;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  onBackToOrbs: () => void;
  initialSearchQuery?: string;
  initialSelectedAudiobook?: AudiobookItem | null;
  onSwitchToBook?: (query: string, matchedBook?: BookItem) => void;
}

const GENRES = [
  { id: 'popular', label: 'Popular', icon: Sparkles },
  { id: 'literature', label: 'Literature', icon: Feather },
  { id: 'science fiction', label: 'Sci-Fi', icon: Orbit },
  { id: 'mystery', label: 'Mystery', icon: Eye },
  { id: 'philosophy', label: 'Philosophy', icon: Compass },
  { id: 'history', label: 'History', icon: Landmark },
  { id: 'poetry', label: 'Poetry', icon: BookOpen },
  { id: 'fantasy', label: 'Fantasy', icon: Flame },
] as const;

const LANGUAGES = [
  { id: 'all', label: 'All Languages' },
  { id: 'English', label: 'English' },
  { id: 'Arabic', label: 'Arabic' },
  { id: 'French', label: 'French' },
  { id: 'Spanish', label: 'Spanish' },
  { id: 'German', label: 'German' },
] as const;

const SPEED_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const PROGRESS_STORAGE_KEY = 'nl_liquid_glass_audiobook_progress_v3';

interface AudiobookProgressRecord {
  audiobookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  iaId?: string;
  chapterIndex: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

function formatDurationClock(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const AudiobooksStage: React.FC<AudiobooksStageProps> = ({
  externalMuted,
  onToggleMute,
  onAudioActiveChange,
  onAudioElementMount,
  onBackToOrbs,
  initialSearchQuery = '',
  initialSelectedAudiobook = null,
  onSwitchToBook,
}) => {
  const [query, setQuery] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [genre, setGenre] = useState('popular');
  const [language, setLanguage] = useState('all');
  const [page, setPage] = useState(1);
  const [langExpanded, setLangExpanded] = useState(false);
  const topbarRef = useRef<HTMLElement | null>(null);

  // Ambient silent YouTube background video state (Default: On, 50% veil)
  const [ambientVideoId, setAmbientVideoId] = useState<string>(() => getRandomAmbientVideoId());
  const [showVideoBg, setShowVideoBg] = useState<boolean>(true);

  // Click-outside listener for topbar popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setLangExpanded(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Instant 0ms initialization from Super Cache
  const [audiobooks, setAudiobooks] = useState<AudiobookItem[]>(() => {
    return (
      getCachedAudiobooksCatalogSync({
        q: initialSearchQuery,
        genre: 'popular',
        lang: 'all',
        page: 1,
      }) || []
    );
  });
  const [loading, setLoading] = useState<boolean>(() => audiobooks.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Cross-stage morph animation state
  const [isMorphingOut, setIsMorphingOut] = useState(false);

  // Selected Audiobook & SunAlbumsStage-inspired Chapter Player State
  const [selectedBook, setSelectedBook] = useState<AudiobookItem | null>(null);
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(true);

  // Probed written book counterparts per audiobook ID
  const [probedBookMap, setProbedBookMap] = useState<Record<string, BookItem>>({});

  // Draggable Expanded Player Card state (identical to SunAlbumsStage)
  const [playerDragOffset, setPlayerDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const playerDragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Saved listening progress map
  const [progressMap, setProgressMap] = useState<Record<string, AudiobookProgressRecord>>(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);
  const ascendedCoverRef = useRef<HTMLDivElement | null>(null);

  // Pre-warm written books cross-link cache on mount
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchTrendingBooks({ period: 'weekly', category: 'trending', page: 1, signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Register <audio> element with LiquidGlass audio coordinator
  useEffect(() => {
    const el = audioRef.current;
    onAudioElementMount?.(el);
    return () => {
      onAudioElementMount?.(null);
      onAudioActiveChange?.(false);
    };
  }, [onAudioElementMount, onAudioActiveChange]);

  // Sync external mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = externalMuted;
    }
  }, [externalMuted]);

  // Sync external initialSearchQuery
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== query) {
      setQuery(initialSearchQuery);
      setDebouncedQuery(initialSearchQuery);
      setPage(1);
    }
  }, [initialSearchQuery, query]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // Load Audiobooks Catalog (Super Cache first, then network)
  const loadCatalog = useCallback(
    async (targetPage: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else {
        const instant = getCachedAudiobooksCatalogSync({
          q: debouncedQuery,
          genre,
          lang: language,
          page: targetPage,
        });
        if (instant && instant.length > 0) {
          setAudiobooks(instant);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const results = await fetchAudiobooksCatalog({
          q: debouncedQuery,
          genre,
          lang: language,
          page: targetPage,
          signal,
        });
        if (signal?.aborted) return;
        setAudiobooks((prev) => {
          if (!append) return results;
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...results.filter((a) => !seen.has(a.id))];
        });
      } catch {
        /* ignore */
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedQuery, genre, language],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void loadCatalog(1, false, ctrl.signal);
    return () => ctrl.abort();
  }, [loadCatalog]);

  // Background probe written book counterparts for visible audiobooks
  useEffect(() => {
    if (audiobooks.length === 0) return undefined;
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      for (const a of audiobooks.slice(0, 8)) {
        if (cancelled) break;
        const instant = getInstantBookMatchForAudiobook(a);
        if (instant.matchedBook) {
          setProbedBookMap((prev) => ({ ...prev, [a.id]: instant.matchedBook! }));
          continue;
        }
        if (debouncedQuery) {
          const found = await probeWrittenBookForAudiobook(a, ctrl.signal);
          if (!cancelled && found) {
            setProbedBookMap((prev) => ({ ...prev, [a.id]: found }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [audiobooks, debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setPage(next);
    void loadCatalog(next, true);
  }, [loading, loadingMore, page, loadCatalog]);

  // Save listening progress to localStorage
  const saveListeningProgress = useCallback(
    (book: AudiobookItem, chIdx: number, timeSec: number, durSec: number) => {
      if (!book || timeSec < 2) return;
      const rec: AudiobookProgressRecord = {
        audiobookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        iaId: book.iaId,
        chapterIndex: chIdx,
        currentTime: Math.floor(timeSec),
        duration: Math.floor(durSec || 0),
        updatedAt: Date.now(),
      };
      setProgressMap((prev) => {
        const next = { ...prev, [book.id]: rec };
        try {
          localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  // Start playing a specific chapter index
  const startChapterPlayback = useCallback(
    (chapterList: AudiobookChapter[], index: number, seekSec = 0) => {
      const ch = chapterList[index];
      const audio = audioRef.current;
      if (!ch || !audio) return;

      setActiveChapterIdx(index);
      setIsPlayerExpanded(true);
      setIsBuffering(true);
      audio.src = ch.url;
      audio.playbackRate = playbackRate;
      audio.muted = externalMuted;

      const onLoaded = () => {
        if (seekSec > 0 && seekSec < (audio.duration || Infinity) - 3) {
          audio.currentTime = seekSec;
        }
        setDuration(audio.duration || ch.duration || 0);
        setIsBuffering(false);
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      };

      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      audio.load();
    },
    [playbackRate, externalMuted],
  );

  // Open an Audiobook & Load Chapters
  const openAudiobook = useCallback(
    async (book: AudiobookItem, autoResume = true) => {
      setSelectedBook(book);
      setLoadingChapters(true);
      setChapters([]);
      setPlayerDragOffset({ x: 0, y: 0 });
      setIsPlayerExpanded(true);
      setAmbientVideoId(getRandomAmbientVideoId());

      probeWrittenBookForAudiobook(book)
        .then((found) => {
          if (found) {
            setProbedBookMap((prev) => ({ ...prev, [book.id]: found }));
          }
        })
        .catch(() => {});

      try {
        const { coverUrl, tracks } = await fetchAudiobookChapters(book);
        if (coverUrl && coverUrl !== book.coverUrl) {
          setSelectedBook((prev) => (prev ? { ...prev, coverUrl } : prev));
        }
        setChapters(tracks);
        if (tracks.length > 0) {
          const saved = progressMap[book.id];
          const resumeIdx =
            autoResume && saved && saved.chapterIndex < tracks.length ? saved.chapterIndex : 0;
          const resumeSec = autoResume && saved ? saved.currentTime : 0;
          startChapterPlayback(tracks, resumeIdx, resumeSec);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingChapters(false);
      }
    },
    [progressMap, startChapterPlayback],
  );

  // Automatically open initialSelectedAudiobook if passed from BooksStage cross-link
  const openedInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      initialSelectedAudiobook &&
      openedInitialRef.current !== initialSelectedAudiobook.id
    ) {
      openedInitialRef.current = initialSelectedAudiobook.id;
      void openAudiobook(initialSelectedAudiobook, true);
    }
  }, [initialSelectedAudiobook, openAudiobook]);

  // Organic Wobbling Droplet Animation on Selected Audiobook Cover (identical to SunAlbumsStage)
  useEffect(() => {
    if (!selectedBook) return undefined;
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
  }, [selectedBook]);

  // Audio Element Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onAudioActiveChange?.(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      onAudioActiveChange?.(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(audio.currentTime || 0);
      }
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      if (selectedBook && Math.floor(audio.currentTime) % 5 === 0) {
        saveListeningProgress(
          selectedBook,
          activeChapterIdx,
          audio.currentTime,
          audio.duration || duration,
        );
      }
    };
    const onEnded = () => {
      if (activeChapterIdx + 1 < chapters.length) {
        startChapterPlayback(chapters, activeChapterIdx + 1, 0);
      } else {
        setIsPlaying(false);
        onAudioActiveChange?.(false);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [
    selectedBook,
    activeChapterIdx,
    chapters,
    duration,
    onAudioActiveChange,
    saveListeningProgress,
    startChapterPlayback,
  ]);

  const togglePlayPause = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const skipSeconds = useCallback((delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    const target = Math.max(0, Math.min((audio.duration || 0) - 1, audio.currentTime + delta));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const handleRestartChapter = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (audio.paused) {
      void audio.play().catch(() => {});
    }
  }, []);

  const cycleSpeed = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlaybackRate((prev) => {
      const idx = SPEED_RATES.indexOf(prev as (typeof SPEED_RATES)[number]);
      const next = SPEED_RATES[(idx + 1) % SPEED_RATES.length];
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      return next;
    });
  }, []);

  // Capillary Seek Bar Scrubbing Handlers
  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      const audio = audioRef.current;
      if (!bar || !audio || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      const target = ratio * duration;
      audio.currentTime = target;
      setCurrentTime(target);
    },
    [duration],
  );

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleSeekPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      e.stopPropagation();
      seekAudioClientX(e.clientX);
    },
    [seekAudioClientX],
  );

  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  // Draggable Expanded Player Card Handlers
  const handlePlayerCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="slider"]') ||
        target.closest('.lg-seek-hit')
      ) {
        return;
      }
      e.stopPropagation();
      playerDragStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: playerDragOffset.x,
        origY: playerDragOffset.y,
      };
      setIsDraggingPlayer(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [playerDragOffset.x, playerDragOffset.y],
  );

  const handlePlayerCardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playerDragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    setPlayerDragOffset({
      x: Math.max(-vw * 0.4, Math.min(vw * 0.4, drag.origX + dx)),
      y: Math.max(-vh * 0.4, Math.min(vh * 0.4, drag.origY + dy)),
    });
  }, []);

  const handlePlayerCardPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playerDragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();
    playerDragStartRef.current = null;
    setIsDraggingPlayer(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const handleBackNavigation = useCallback(() => {
    if (selectedBook) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      onAudioActiveChange?.(false);
      setIsPlaying(false);
      setSelectedBook(null);
      setPlayerDragOffset({ x: 0, y: 0 });
    } else {
      onBackToOrbs();
    }
  }, [selectedBook, onBackToOrbs, onAudioActiveChange]);

  // Escape key returns from Selected Audiobook -> Grid, or Grid -> Orbs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedBook) {
        e.stopPropagation();
        e.preventDefault();
        handleBackNavigation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedBook, handleBackNavigation]);

  // Animated cross-stage transition to Written Book edition
  const triggerSwitchToWrittenBook = useCallback(
    async (item: AudiobookItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!onSwitchToBook) return;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          /* ignore */
        }
      }
      onAudioActiveChange?.(false);
      setIsMorphingOut(true);

      const instant = getInstantBookMatchForAudiobook(item);
      let matched: BookItem | undefined = probedBookMap[item.id] ?? instant.matchedBook ?? undefined;
      if (!matched) {
        try {
          matched = (await probeWrittenBookForAudiobook(item)) ?? undefined;
        } catch {
          /* ignore */
        }
      }
      setTimeout(() => {
        onSwitchToBook(matched?.title || instant.searchQuery || item.title, matched);
      }, 240);
    },
    [onSwitchToBook, onAudioActiveChange, probedBookMap],
  );

  // Smart Empty-Space Click Handler:
  // Steps back from Player -> Grid, and from Grid -> 4 Orbs
  const handleStageEmptySpaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('.lg-audiobook-unit') ||
        target.closest('.lg-topbar-shell') ||
        target.closest('.lg-album-player-column') ||
        target.closest('.lg-resume-tubes-strip')
      ) {
        return;
      }
      handleBackNavigation();
    },
    [handleBackNavigation],
  );

  const recentProgressList = useMemo(() => {
    return (Object.values(progressMap) as AudiobookProgressRecord[])
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4);
  }, [progressMap]);

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  const activeLangObj = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  return (
    <div
      className={`lg-audiobooks-stage-root${
        isMorphingOut ? ' lg-audiobooks-stage-root--morph-out' : ''
      }`}
      dir="ltr"
      onClick={handleStageEmptySpaceClick}
    >
      <style>{AUDIOBOOKS_LIQUID_GLASS_STYLES}</style>

      {/* Hidden Singleton <audio> Element */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {/* Contextual Back Button (Selected Audiobook -> Grid, or Grid -> Orbs) */}
      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleBackNavigation();
        }}
        aria-label={selectedBook ? 'Back to Audiobooks' : 'Back to Portal Orbs'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {/* ====================================================================
       * VIEW 1: STREAMLINED LIQUID GLASS TOP BAR + FLOATING AUDIOBOOK POSTERS
       * ==================================================================== */}
      {!selectedBook && (
        <div className="lg-audiobooks-catalog-scroll" onClick={handleStageEmptySpaceClick}>
          {/* Streamlined Top Bar: 1 Row on Desktop, 2 Rows on Mobile */}
          <header className="lg-topbar-shell" ref={topbarRef} onClick={(e) => e.stopPropagation()}>
            <div className="lg-topbar-primary-row">
              {/* Search Input Capsule */}
              <div className="lg-track-tube lg-search-capsule">
                <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                <Search size={15} className="lg-search-capsule__icon" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search audiobooks, authors, narrators..."
                  className="lg-search-capsule__input"
                  aria-label="Search audiobooks"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="lg-glass-pill lg-search-capsule__clear"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Expandable Language Branch Pill (Default: All Languages) */}
              <div className="lg-branch-filter-group">
                <button
                  type="button"
                  onClick={() => setLangExpanded((v) => !v)}
                  className={`lg-glass-pill lg-filter-pill ${
                    language !== 'all' || langExpanded ? 'lg-filter-pill--active' : ''
                  }`}
                  title="Select Language"
                >
                  <Languages size={14} />
                  <span>{activeLangObj.label}</span>
                  <ChevronDown
                    size={13}
                    className={`lg-chevron-icon${langExpanded ? ' lg-chevron-icon--open' : ''}`}
                  />
                </button>

                {langExpanded && (
                  <div className="lg-branch-popover">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setLanguage(l.id);
                          setPage(1);
                          setLangExpanded(false);
                        }}
                        className={`lg-glass-pill lg-filter-pill lg-filter-pill--sm ${
                          language === l.id ? 'lg-filter-pill--active' : ''
                        }`}
                      >
                        <span>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mute / Unmute Button */}
              <button
                type="button"
                onClick={onToggleMute}
                className="lg-glass-pill lg-icon-round-btn"
                aria-label={externalMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {externalMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>

            {/* Genre Pills with Monochrome Vector Icons */}
            <div className="lg-topbar-genres-row">
              {GENRES.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setGenre(g.id);
                      setPage(1);
                    }}
                    className={`lg-glass-pill lg-filter-pill ${
                      genre === g.id ? 'lg-filter-pill--active' : ''
                    }`}
                  >
                    <Icon size={13} />
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* Continue Listening Strip (if saved progress exists) */}
          {recentProgressList.length > 0 && !debouncedQuery && (
            <div className="lg-resume-tubes-strip" onClick={(e) => e.stopPropagation()}>
              {recentProgressList.map((rec) => (
                <button
                  key={rec.audiobookId}
                  type="button"
                  onClick={() =>
                    void openAudiobook(
                      {
                        id: rec.audiobookId,
                        iaId: rec.iaId,
                        title: rec.title,
                        author: rec.author,
                        coverUrl: rec.coverUrl,
                        source: 'Saved',
                      },
                      true,
                    )
                  }
                  className="lg-track-tube lg-resume-tube-item"
                >
                  <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                  <span className="lg-tube-play-btn lg-tube-play-btn--sm">
                    <Play size={13} fill="currentColor" />
                  </span>
                  <div className="lg-resume-tube-item__meta">
                    <span className="lg-resume-tube-item__title">{rec.title}</span>
                    <span className="lg-resume-tube-item__sub">
                      Resume Ch. {rec.chapterIndex + 1} · {formatDurationClock(rec.currentTime)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Audiobooks Grid Directly Over Portal Background */}
          {loading ? (
            <div className="lg-audiobooks-grid">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="lg-audiobook-unit">
                  <div className="lg-audiobook-poster-frame lg-audiobook-poster-frame--skeleton">
                    <span className="lg-main-glass__caustic" aria-hidden="true" />
                    <span className="lg-main-glass__rim" aria-hidden="true" />
                  </div>
                  <div className="lg-track-tube lg-audiobook-info-capsule lg-audiobook-info-capsule--skeleton">
                    <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          ) : audiobooks.length === 0 ? (
            <div className="lg-empty-glass-state">
              <div className="lg-track-tube lg-empty-glass-capsule">
                <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                <Headphones size={30} className="lg-empty-glass-icon" />
                <p className="lg-empty-glass-title">No matching audiobooks found</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setGenre('popular');
                    setLanguage('all');
                  }}
                  className="lg-glass-pill lg-filter-pill lg-filter-pill--active"
                >
                  <RefreshCw size={14} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="lg-audiobooks-grid" role="list">
                {audiobooks.map((item, idx) => {
                  const [c1, c2, c3] = getBookArtisticPalette(item.title + item.author);
                  const savedRec = progressMap[item.id];
                  const instantBook = getInstantBookMatchForAudiobook(item);
                  const matchedBook = probedBookMap[item.id] || instantBook.matchedBook;
                  const hasBookVersion = Boolean(matchedBook || instantBook.hasBook);

                  return (
                    <article
                      key={item.id}
                      role="listitem"
                      className="lg-audiobook-unit"
                      style={{ '--card-idx': idx % 24 } as React.CSSProperties}
                    >
                      {/* 1. Poster with Thin Luminous Liquid Glass Rim */}
                      <div
                        className="lg-audiobook-poster-frame"
                        onClick={() => void openAudiobook(item, true)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Listen to ${item.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void openAudiobook(item, true);
                          }
                        }}
                      >
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="lg-audiobook-poster-img"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (item.fallbackCoverUrl && img.src !== item.fallbackCoverUrl) {
                                img.src = item.fallbackCoverUrl;
                              } else {
                                img.style.display = 'none';
                              }
                            }}
                          />
                        ) : null}

                        {/* Artistic Fallback Cover */}
                        <div
                          className="lg-audiobook-poster-fallback"
                          style={{
                            background: `linear-gradient(145deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
                          }}
                        >
                          <Headphones size={28} className="lg-audiobook-poster-fallback__icon" />
                          <span className="lg-audiobook-poster-fallback__title">{item.title}</span>
                          <span className="lg-audiobook-poster-fallback__author">{item.author}</span>
                        </div>

                        {/* Ultra-thin Liquid Glass Rim & Caustic Specular Border */}
                        <span className="lg-main-glass__caustic" aria-hidden="true" />
                        <span className="lg-main-glass__rim" aria-hidden="true" />
                        <span className="lg-main-glass__sheen" aria-hidden="true" />

                        {/* Floating Play Droplet Badge */}
                        <span className="lg-glass-pill lg-poster-play-badge" aria-hidden="true">
                          <Play size={14} fill="currentColor" />
                        </span>

                        {savedRec && (
                          <span className="lg-glass-pill lg-poster-resume-badge">
                            Ch. {savedRec.chapterIndex + 1}
                          </span>
                        )}
                      </div>

                      {/* 2. Separate Floating Liquid Glass Capsule Underneath the Poster */}
                      <div
                        className="lg-track-tube lg-audiobook-info-capsule"
                        onClick={() => void openAudiobook(item, true)}
                      >
                        <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                        <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                        <h3 className="lg-audiobook-capsule-title" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="lg-audiobook-capsule-author" title={item.author}>
                          {item.author}
                          {item.runtime ? ` · ${item.runtime}` : ''}
                        </p>

                        {/* Action Bar:
                            - If BOTH Audio & Read exist: Split 50/50 Capsule [ Violet Headphones (Listen) | Emerald Eye (Read) ]
                            - If ONLY Audio exists: Full-width Violet Headphones (Listen) */}
                        <div className="lg-audiobook-capsule-actions">
                          {hasBookVersion && onSwitchToBook ? (
                            <div className="lg-dual-split-pill" role="group" aria-label="Listen or Read">
                              <button
                                type="button"
                                className="lg-dual-split-pill__half lg-dual-split-pill__half--audio"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void openAudiobook(item, true);
                                }}
                                title="Listen to Audiobook"
                              >
                                <Headphones size={14} strokeWidth={2.2} />
                                <span>Listen</span>
                              </button>
                              <span className="lg-dual-split-pill__divider" aria-hidden="true" />
                              <button
                                type="button"
                                className="lg-dual-split-pill__half lg-dual-split-pill__half--read"
                                onClick={(e) => void triggerSwitchToWrittenBook(item, e)}
                                title="Read Written Edition"
                              >
                                <Eye size={14} strokeWidth={2.2} />
                                <span>Read</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="lg-single-audio-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openAudiobook(item, true);
                              }}
                              title="Listen to Audiobook"
                            >
                              <Headphones size={14} strokeWidth={2.2} />
                              <span>Listen</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {audiobooks.length >= 12 && (
                <div className="lg-load-more-row">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="lg-glass-pill lg-load-more-pill"
                  >
                    <RefreshCw size={15} className={loadingMore ? 'lg-spin' : ''} />
                    <span>{loadingMore ? 'Loading...' : 'Load More Audiobooks'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====================================================================
       * VIEW 2: SELECTED AUDIOBOOK WORKSPACE (Inspired by SunAlbumsStage!)
       *         Wobbling Droplet Cover + Clear Bubble Glass Chapter Tubes +
       *         Draggable Expanded Player Card with Capillary Liquid Seek Bar
       * ==================================================================== */}
      {selectedBook && (
        <div className="lg-album-detail-workspace" onClick={handleStageEmptySpaceClick}>
          {/* Ambient Silent YouTube Background Video with 50% Dark Veil */}
          {showVideoBg && ambientVideoId && (
            <div className="lg-audiobook-ambient-video-layer" aria-hidden="true">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ambientVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ambientVideoId}&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&modestbranding=1`}
                title="Ambient Nature & Space Background"
                className="lg-ambient-video-iframe"
                allow="autoplay; encrypted-media"
                tabIndex={-1}
              />
              <div className="lg-ambient-video-veil" />
            </div>
          )}

          <div className="lg-album-player-column" onClick={(e) => e.stopPropagation()}>
            {/* 1. Selected Audiobook Hero with Wobbling Sun/Earth Droplet Cover */}
            <header className="lg-ascended-album-hero">
              <div
                ref={ascendedCoverRef}
                className="lg-ascended-album-cover lg-ascended-album-cover--sun-bubble"
              >
                {selectedBook.coverUrl ? (
                  <img
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    className="lg-ascended-album-cover__img"
                    decoding="async"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="lg-audiobook-poster-fallback"
                    style={{
                      background: 'linear-gradient(145deg, #31102f 0%, #6d28d9 55%, #38bdf8 100%)',
                    }}
                  >
                    <Headphones size={34} className="lg-audiobook-poster-fallback__icon" />
                  </div>
                )}
                <span className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
                <span className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
                <span className="lg-main-glass__sheen" aria-hidden="true" />
              </div>

              <div className="lg-ascended-album-meta">
                <h1 className="lg-ascended-album-title">{selectedBook.title}</h1>
                <p className="lg-ascended-album-artist">
                  {selectedBook.author} · {chapters.length || selectedBook.chapterCount || 1} Chapters
                </p>

                {/* Cross-Link to Written Book Edition inside Player */}
                {onSwitchToBook && (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => void triggerSwitchToWrittenBook(selectedBook, e)}
                      className="lg-glass-pill lg-filter-pill lg-filter-pill--read-cta"
                    >
                      <Eye size={13} />
                      <span>Read Book Edition</span>
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* 2. Scrollable List of Clear Bubble Glass Chapter Tubes */}
            <div
              className="lg-track-tubes-list"
              role="list"
              aria-label={`Chapters of ${selectedBook.title}`}
            >
              {loadingChapters ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="lg-track-tube lg-audiobook-info-capsule--skeleton"
                    style={{ height: '58px' }}
                  >
                    <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  </div>
                ))
              ) : chapters.length === 0 ? (
                <div className="lg-track-tube" style={{ padding: '22px', textAlign: 'center' }}>
                  <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                  <p style={{ margin: 0, fontWeight: 800, color: '#fff3a8' }}>
                    No direct audio chapters available for this edition.
                  </p>
                </div>
              ) : (
                chapters.map((ch, idx) => {
                  const isSelectedChapter = activeChapterIdx === idx;
                  const isExpandedCard = isSelectedChapter && isPlayerExpanded;
                  const chNumFormatted = String(ch.index || idx + 1).padStart(2, '0');

                  return (
                    <div
                      key={`${ch.index}_${idx}`}
                      role="listitem"
                      className={`lg-track-tube${
                        isSelectedChapter ? ' lg-track-tube--current' : ''
                      }${isExpandedCard ? ' lg-track-tube--expanded-player' : ''}${
                        isExpandedCard && isDraggingPlayer ? ' lg-track-tube--dragging-player' : ''
                      }`}
                      style={
                        {
                          '--tube-delay': `${Math.min(idx * 20, 300)}ms`,
                          transform: isExpandedCard
                            ? `translate3d(${playerDragOffset.x.toFixed(1)}px, ${playerDragOffset.y.toFixed(1)}px, 0)`
                            : undefined,
                          zIndex: isExpandedCard ? 60 : undefined,
                        } as React.CSSProperties
                      }
                      onPointerDown={isExpandedCard ? handlePlayerCardPointerDown : undefined}
                      onPointerMove={isExpandedCard ? handlePlayerCardPointerMove : undefined}
                      onPointerUp={isExpandedCard ? handlePlayerCardPointerUp : undefined}
                      onPointerCancel={isExpandedCard ? handlePlayerCardPointerUp : undefined}
                      onClick={() => {
                        if (!isExpandedCard) {
                          if (isSelectedChapter) {
                            setIsPlayerExpanded(true);
                            togglePlayPause();
                          } else {
                            startChapterPlayback(chapters, idx, 0);
                          }
                        }
                      }}
                    >
                      <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                      <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                      {/* ── COMPACT CHAPTER TUBE STATE ── */}
                      {!isExpandedCard && (
                        <div className="lg-track-tube__header">
                          {isSelectedChapter ? (
                            <button
                              type="button"
                              className="lg-tube-play-btn"
                              onClick={togglePlayPause}
                              aria-label={isPlaying ? 'Pause' : 'Play'}
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
                            <span className="lg-track-tube__num">
                              <span className="lg-track-tube__num-glyph">{chNumFormatted}</span>
                            </span>
                          )}

                          <span className="lg-track-tube__title">{ch.title}</span>

                          <span className="lg-audiobook-ch-duration">
                            {ch.duration > 0 ? formatDurationClock(ch.duration) : 'MP3'}
                          </span>
                        </div>
                      )}

                      {/* ── EXPANDED DRAGGABLE LIQUID GLASS PLAYER CARD ── */}
                      {isExpandedCard && (
                        <div
                          className="lg-expanded-player-card"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="lg-expanded-player__top-row">
                            <span
                              className="lg-expanded-player__drag-badge"
                              title="Drag player anywhere on screen"
                            >
                              <Move size={14} />
                            </span>

                            <div className="lg-expanded-player__track-info">
                              <span className="lg-expanded-player__track-title">
                                {chNumFormatted}. {ch.title}
                              </span>
                              <span className="lg-expanded-player__track-sub">
                                {selectedBook.title} · {selectedBook.author}
                              </span>
                            </div>

                            <div className="lg-expanded-player__top-actions">
                              {/* Playback Speed Pill */}
                              <button
                                type="button"
                                className="lg-tube-lyrics-toggle lg-tube-lyrics-toggle--active"
                                onClick={cycleSpeed}
                                title="Playback Speed"
                              >
                                <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>
                                  {playbackRate}x
                                </span>
                              </button>

                              {/* Ambient Video Backdrop Toggle (Default On, 50% Veil, Muted) */}
                              <button
                                type="button"
                                className={`lg-tube-lyrics-toggle ${showVideoBg ? 'lg-tube-lyrics-toggle--active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowVideoBg((v) => !v);
                                }}
                                title={showVideoBg ? 'Disable Ambient Video Backdrop' : 'Enable Ambient Video Backdrop'}
                                aria-label="Toggle ambient video backdrop"
                              >
                                {showVideoBg ? <Video size={14} /> : <VideoOff size={14} />}
                              </button>

                              {/* Direct MP3 Download */}
                              <a
                                href={ch.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lg-tube-lyrics-toggle"
                                title="Download Chapter Audio"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download size={14} />
                              </a>

                              {/* Collapse Player */}
                              <button
                                type="button"
                                className="lg-tube-collapse-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsPlayerExpanded(false);
                                  setPlayerDragOffset({ x: 0, y: 0 });
                                }}
                                title="Collapse Player"
                                aria-label="Collapse Player"
                              >
                                <ChevronUp size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>

                          {/* Capillary Liquid Seek Bar */}
                          <div className="lg-expanded-player__progress-section">
                            <div
                              ref={seekBarRef}
                              className="lg-seek-hit lg-tube-seek-hit"
                              role="slider"
                              tabIndex={0}
                              aria-label="Seek audiobook position"
                              aria-valuemin={0}
                              aria-valuemax={Math.round(duration || 0)}
                              aria-valuenow={Math.round(currentTime || 0)}
                              onPointerDown={handleSeekPointerDown}
                              onPointerMove={handleSeekPointerMove}
                              onPointerUp={handleSeekPointerUp}
                              onPointerCancel={handleSeekPointerUp}
                            >
                              <div className="lg-seek-track lg-tube-seek-track">
                                <div
                                  className="lg-seek-fill lg-tube-seek-fill"
                                  style={{ width: `${progressPercent}%` }}
                                >
                                  <span className="lg-seek-fill__wave" aria-hidden="true" />
                                </div>
                                <div
                                  className="lg-seek-thumb lg-tube-seek-thumb"
                                  style={{ left: `${progressPercent}%` }}
                                />
                                <div className="lg-seek-tube-gloss" aria-hidden="true" />
                              </div>
                            </div>

                            <div className="lg-expanded-player__time-row">
                              <span>{formatDurationClock(currentTime)}</span>
                              <span>-{formatDurationClock(Math.max(0, duration - currentTime))}</span>
                            </div>
                          </div>

                          {/* Full Media Controls Row: Restart | -15s | Prev | Play/Pause | Next | +15s | Volume */}
                          <div className="lg-expanded-player__controls-row">
                            <button
                              type="button"
                              className="lg-player-side-btn"
                              onClick={handleRestartChapter}
                              title="Restart Chapter"
                              aria-label="Restart Chapter"
                            >
                              <RotateCcw size={15} strokeWidth={2.3} />
                            </button>

                            <div className="lg-player-center-trio" style={{ gap: '10px' }}>
                              <button
                                type="button"
                                className="lg-player-trio-btn"
                                onClick={(e) => skipSeconds(-15, e)}
                                title="Rewind 15 seconds"
                                aria-label="Rewind 15 seconds"
                              >
                                <Rewind size={16} />
                              </button>

                              <button
                                type="button"
                                className="lg-player-trio-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeChapterIdx > 0) {
                                    startChapterPlayback(chapters, activeChapterIdx - 1, 0);
                                  }
                                }}
                                disabled={activeChapterIdx <= 0}
                                title="Previous Chapter"
                                aria-label="Previous Chapter"
                              >
                                <SkipBack size={17} fill="currentColor" />
                              </button>

                              <button
                                type="button"
                                className="lg-player-trio-btn lg-player-trio-btn--primary"
                                onClick={togglePlayPause}
                                title={isPlaying ? 'Pause' : 'Play'}
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                              >
                                {isBuffering ? (
                                  <span className="lg-tube-mini-spinner" aria-hidden="true" />
                                ) : isPlaying ? (
                                  <Pause size={21} fill="currentColor" />
                                ) : (
                                  <Play size={21} fill="currentColor" />
                                )}
                              </button>

                              <button
                                type="button"
                                className="lg-player-trio-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeChapterIdx + 1 < chapters.length) {
                                    startChapterPlayback(chapters, activeChapterIdx + 1, 0);
                                  }
                                }}
                                disabled={activeChapterIdx + 1 >= chapters.length}
                                title="Next Chapter"
                                aria-label="Next Chapter"
                              >
                                <SkipForward size={17} fill="currentColor" />
                              </button>

                              <button
                                type="button"
                                className="lg-player-trio-btn"
                                onClick={(e) => skipSeconds(15, e)}
                                title="Forward 15 seconds"
                                aria-label="Forward 15 seconds"
                              >
                                <FastForward size={16} />
                              </button>
                            </div>

                            <button
                              type="button"
                              className="lg-player-side-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleMute();
                              }}
                              title={externalMuted ? 'Unmute' : 'Mute'}
                              aria-label={externalMuted ? 'Unmute' : 'Mute'}
                            >
                              {externalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Scoped Liquid Glass Styles for AudiobooksStage
// ============================================================================
const AUDIOBOOKS_LIQUID_GLASS_STYLES = `
  .lg-audiobooks-stage-root {
    position: relative;
    z-index: 12;
    width: 100dvw;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    color: #ffffff;
    user-select: none;
    transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease, filter 0.24s ease;
    animation: lgAudioStageMorphIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .lg-audiobooks-stage-root--morph-out {
    opacity: 0;
    transform: perspective(1200px) rotateY(14deg) scale(0.94);
    filter: blur(6px);
  }

  @keyframes lgAudioStageMorphIn {
    0% {
      opacity: 0;
      transform: perspective(1200px) rotateY(-12deg) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: perspective(1200px) rotateY(0deg) scale(1);
    }
  }

  .lg-audiobooks-catalog-scroll {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: max(18px, calc(env(safe-area-inset-top) + 12px)) clamp(14px, 3vw, 40px) 96px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
  }

  .lg-topbar-shell {
    width: 100%;
    max-width: 1380px;
    padding-left: 52px;
    padding-right: 52px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 30;
  }

  @media (min-width: 1180px) {
    .lg-topbar-shell {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
  }

  .lg-topbar-primary-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .lg-topbar-genres-row {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    padding: 2px 2px 4px;
    scrollbar-width: none;
    min-width: 0;
  }

  .lg-topbar-genres-row::-webkit-scrollbar {
    display: none;
  }

  .lg-search-capsule {
    position: relative;
    flex: 1 1 240px;
    min-width: 170px;
    max-width: 340px;
    height: 38px;
    padding: 0 12px !important;
    border-radius: 999px !important;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lg-search-capsule__icon {
    color: rgba(255, 255, 255, 0.9);
    flex-shrink: 0;
    z-index: 3;
  }

  .lg-search-capsule__input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 0.82rem;
    font-weight: 700;
    z-index: 3;
  }

  .lg-search-capsule__input::placeholder {
    color: rgba(255, 255, 255, 0.65);
    font-weight: 600;
  }

  .lg-search-capsule__clear {
    width: 22px;
    height: 22px;
    padding: 0;
    cursor: pointer;
    z-index: 3;
    flex-shrink: 0;
  }

  .lg-branch-filter-group {
    position: relative;
    flex-shrink: 0;
  }

  .lg-branch-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 120;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 200px;
    max-width: min(300px, 92vw);
    padding: 10px;
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.06) 100%),
      rgba(10, 15, 28, 0.88);
    -webkit-backdrop-filter: blur(24px) saturate(190%);
    backdrop-filter: blur(24px) saturate(190%);
    box-shadow:
      0 20px 48px rgba(0, 0, 0, 0.65),
      inset 0 1.4px 2px rgba(255, 255, 255, 0.85);
  }

  .lg-chevron-icon {
    transition: transform 0.18s ease;
    opacity: 0.85;
  }

  .lg-chevron-icon--open {
    transform: rotate(180deg);
  }

  .lg-filter-pill {
    height: 34px;
    padding: 0 12px;
    font-size: 0.76rem;
    font-weight: 800;
    gap: 6px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.92);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  }

  .lg-filter-pill--sm {
    height: 30px;
    padding: 0 10px;
    font-size: 0.73rem;
  }

  .lg-filter-pill:hover {
    transform: translateY(-1px) scale(1.03);
  }

  .lg-filter-pill--active {
    color: #fff6c2 !important;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 215, 90, 0.16) 100%),
      rgba(20, 28, 44, 0.38) !important;
    box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.34),
      0 0 16px rgba(255, 220, 96, 0.35),
      inset 0 1.5px 2px #ffffff !important;
  }

  .lg-filter-pill--read-cta {
    color: #d1fae5 !important;
    background:
      linear-gradient(180deg, rgba(16, 185, 129, 0.38) 0%, rgba(5, 150, 105, 0.22) 100%),
      rgba(10, 32, 24, 0.45) !important;
    box-shadow:
      0 10px 24px rgba(6, 78, 59, 0.38),
      inset 0 1.4px 1.8px rgba(255, 255, 255, 0.88) !important;
  }

  .lg-icon-round-btn {
    width: 34px;
    height: 34px;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Resume Listening Strip */
  .lg-resume-tubes-strip {
    width: 100%;
    max-width: 1380px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }

  .lg-resume-tube-item {
    padding: 9px 14px !important;
    border-radius: 999px !important;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    text-align: left;
  }

  .lg-tube-play-btn--sm {
    width: 30px !important;
    height: 30px !important;
  }

  .lg-resume-tube-item__meta {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    z-index: 2;
  }

  .lg-resume-tube-item__title {
    font-size: 0.78rem;
    font-weight: 800;
    color: #fff3a8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-resume-tube-item__sub {
    font-size: 0.68rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
  }

  /* ── Audiobooks Grid: Square Droplet Poster + Separate Info Capsule Below ── */
  .lg-audiobooks-grid {
    width: 100%;
    max-width: 1380px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(182px, 1fr));
    gap: 22px 18px;
  }

  /* Lightweight, stable cards with progressive entrance stagger and zero hover jitter */
  .lg-audiobook-unit {
    display: flex;
    flex-direction: column;
    gap: 9px;
    animation: lgAudioCardStaggerIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--card-idx, 0) * 80ms);
    will-change: opacity, transform;
  }

  @keyframes lgAudioCardStaggerIn {
    0% {
      opacity: 0;
      transform: translateY(14px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lg-audiobook-poster-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 26px;
    overflow: hidden;
    cursor: pointer;
    isolation: isolate;
    background: rgba(255, 255, 255, 0.04);
    box-shadow:
      0 18px 40px -12px rgba(0, 0, 0, 0.52),
      inset 0 1.6px 2.2px rgba(255, 255, 255, 0.88),
      inset 0 -1.5px 2.5px rgba(216, 165, 255, 0.32);
    transition: box-shadow 0.22s ease;
  }

  /* Stable hover without layout-shifting transforms */
  .lg-audiobook-unit:hover .lg-audiobook-poster-frame {
    box-shadow:
      0 22px 48px -10px rgba(0, 0, 0, 0.65),
      0 0 18px rgba(216, 165, 255, 0.35),
      inset 0 1.8px 2.4px #ffffff,
      inset 0 -1.5px 2.5px rgba(216, 165, 255, 0.45);
  }

  .lg-audiobook-poster-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 2;
  }

  /* Ambient Silent YouTube Background Video with 50% Dark Veil */
  .lg-audiobook-ambient-video-layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .lg-ambient-video-iframe {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 177.78vh;
    min-width: 100vw;
    height: 56.25vw;
    min-height: 100vh;
    transform: translate(-50%, -50%);
    border: none;
    pointer-events: none;
    filter: brightness(0.92) contrast(1.05);
  }

  .lg-ambient-video-veil {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.50);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    pointer-events: none;
    z-index: 1;
  }

  .lg-album-detail-workspace {
    position: relative;
  }

  .lg-album-player-column {
    position: relative;
    z-index: 5;
  }

  .lg-audiobook-poster-fallback {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
  }

  .lg-audiobook-poster-fallback__icon {
    color: rgba(255, 255, 255, 0.9);
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45));
  }

  .lg-audiobook-poster-fallback__title {
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.26;
    color: #ffffff;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lg-audiobook-poster-fallback__author {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lg-poster-play-badge {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 8;
    width: 34px;
    height: 34px;
    padding: 0;
    color: #ffe880;
  }

  .lg-poster-resume-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 8;
    padding: 3px 9px;
    font-size: 0.65rem;
    font-weight: 800;
    color: #ffe880;
  }

  /* Separate Floating Info Capsule Underneath Poster */
  .lg-audiobook-info-capsule {
    padding: 10px 12px !important;
    border-radius: 18px !important;
    display: flex;
    flex-direction: column;
    gap: 3px;
    cursor: pointer;
  }

  .lg-audiobook-capsule-title {
    position: relative;
    z-index: 2;
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.26;
    color: #fff3a8;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.65);
  }

  .lg-audiobook-capsule-author {
    position: relative;
    z-index: 2;
    margin: 0;
    font-size: 0.71rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-audiobook-capsule-actions {
    position: relative;
    z-index: 3;
    margin-top: 6px;
    width: 100%;
  }

  /* Split 50/50 Dual-Availability Liquid Glass Button */
  .lg-dual-split-pill {
    position: relative;
    width: 100%;
    height: 31px;
    border-radius: 999px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: stretch;
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.32),
      inset 0 1.2px 1.6px rgba(255, 255, 255, 0.9);
  }

  .lg-dual-split-pill__half {
    border: none;
    height: 100%;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 0.71rem;
    font-weight: 800;
    color: #ffffff;
    cursor: pointer;
    transition: filter 0.18s ease;
    white-space: nowrap;
  }

  .lg-dual-split-pill__half:hover {
    filter: brightness(1.14);
  }

  .lg-dual-split-pill__half--read {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.78) 0%,
      rgba(5, 150, 105, 0.62) 100%
    );
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  }

  .lg-dual-split-pill__half--audio {
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.78) 0%,
      rgba(126, 34, 206, 0.64) 100%
    );
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  }

  .lg-dual-split-pill__divider {
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.65);
  }

  .lg-single-audio-pill {
    width: 100%;
    height: 31px;
    border-radius: 999px;
    border: none;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.73rem;
    font-weight: 800;
    color: #ffffff;
    cursor: pointer;
    background: linear-gradient(
      135deg,
      rgba(168, 85, 247, 0.76) 0%,
      rgba(126, 34, 206, 0.6) 100%
    );
    box-shadow:
      0 6px 16px rgba(126, 34, 206, 0.28),
      inset 0 1.2px 1.6px rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
    transition: transform 0.18s ease, filter 0.18s ease;
  }

  .lg-single-audio-pill:hover {
    transform: scale(1.02);
    filter: brightness(1.12);
  }

  .lg-audiobook-ch-duration {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.72rem;
    font-weight: 800;
    color: #ffe880;
    flex-shrink: 0;
    z-index: 2;
  }

  .lg-audiobook-poster-frame--skeleton,
  .lg-audiobook-info-capsule--skeleton {
    animation: lgAudioPulse 1.6s ease-in-out infinite;
  }

  .lg-audiobook-info-capsule--skeleton {
    height: 68px;
  }

  @keyframes lgAudioPulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.85; }
  }

  .lg-load-more-row {
    display: flex;
    justify-content: center;
    padding: 14px 0 28px;
  }

  .lg-load-more-pill {
    height: 42px;
    padding: 0 24px;
    gap: 8px;
    font-size: 0.84rem;
    font-weight: 800;
    cursor: pointer;
  }

  .lg-empty-glass-state {
    width: 100%;
    max-width: 420px;
    margin: 48px auto;
  }

  .lg-empty-glass-capsule {
    padding: 28px 24px !important;
    border-radius: 28px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }

  .lg-empty-glass-icon {
    color: #ffe880;
  }

  .lg-empty-glass-title {
    margin: 0;
    font-size: 0.96rem;
    font-weight: 800;
    color: #ffffff;
  }

  .lg-spin {
    animation: lgSpinAudio 1s linear infinite;
  }

  @keyframes lgSpinAudio {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 760px) {
    .lg-topbar-shell {
      padding-left: 44px;
      padding-right: 44px;
    }

    .lg-topbar-primary-row {
      flex-wrap: wrap;
    }

    .lg-search-capsule {
      flex: 1 1 100%;
      max-width: 100%;
    }

    .lg-audiobooks-grid {
      grid-template-columns: repeat(auto-fill, minmax(144px, 1fr));
      gap: 16px 12px;
    }
  }
`;
