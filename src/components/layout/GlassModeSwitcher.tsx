import {
  Component, useCallback, useEffect, useRef, useState,
  useSyncExternalStore, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Volume2, VolumeX, LogOut, Gamepad2, ChevronLeft, Film, Tv, Joystick, Monitor,
  AudioLines, User, Users, Moon, Sun, MoonStar, Grid2x2, Feather,
  SkipBack, SkipForward, Play, Pause
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuthOptional } from '../../context/AuthContext';
import { useDeviceType } from '../../hooks/useDeviceType';
import { audioManager } from '../../audio/audioManager';
import { useNowPlaying } from '../../features/music/hooks/useNowPlaying';
import type { Theme } from '../../utils/userPrefs';
import '../../styles/components/glass-switcher.css';

const MODES: { id: Theme; label: string; icon: any }[] = [
  { id: 'dark',     label: 'Dark',     icon: Moon },
  { id: 'light',    label: 'Light',    icon: Sun },
  { id: 'midnight', label: 'Midnight', icon: MoonStar },
  { id: 'bit',      label: 'Bit',      icon: Grid2x2 },
  { id: 'lite',     label: 'Lite',     icon: Feather },
];

const SOURCES = ['bg', 'song', 'lens', 'mebit', 'video', 'intro', 'games', 'movies', 'series', 'tv', 'retro'] as const;

const AVOID_SELECTOR =
  '[data-glass-avoid],[aria-label="Close"],[aria-label="Close"],.modal-close-btn,.gallery-close-btn';

const ARABIC_ALIASES: Record<string, string[]> = {
  dark: ['Dark', 'Dark', 'Night', 'dark'],
  light: ['Light', 'Bright', 'Day', 'light'],
  midnight: ['Midnight', 'midnight', 'Night'],
  bit: ['Pixel', 'Retro', 'bit', 'Pixel'],
  lite: ['Lite', 'Fast', 'lite'],
  games: ['Games', 'Games', 'games', 'Play'],
  cinema: ['Movies', 'Cinema', 'movies', 'Movies', 'Movie', 'cinema'],
  tv: ['TV', 'Television', 'tv'],
  retro: ['Retro', 'Old', 'retro'],
  xp: ['Windows', 'xp', 'Computer', 'Desktop'],
  music: ['Music', 'Songs', 'Songs', 'music', 'Audio'],
  accounts: ['Accounts', 'Members', 'Members', 'accounts', 'Users']
};

export function clampOffset(
  base: { left: number; right: number; top: number; bottom: number },
  dx: number, dy: number, vw: number, vh: number, margin = 8,
): { x: number; y: number } {
  let nx = dx, ny = dy;
  if (base.left   + nx < margin)       nx += margin - (base.left   + nx);
  if (base.right  + nx > vw - margin)  nx -= base.right  + nx - (vw - margin);
  if (base.top    + ny < margin)       ny += margin - (base.top    + ny);
  if (base.bottom + ny > vh - margin)  ny -= base.bottom + ny - (vh - margin);
  return { x: nx, y: ny };
}

function useOverlayActive(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const obs = new MutationObserver(cb);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-modal-context'],
    });
    return () => obs.disconnect();
  }, []);
  const getSnapshot = useCallback(() => {
    const b = document.body;
    const ctx = b.getAttribute('data-modal-context');
    return (
      b.classList.contains('has-active-modal') ||
      b.classList.contains('gallery-immersive') ||
      (ctx !== null && ctx !== 'page')
    );
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

class GlassSwitcherBoundary extends Component<
  { children: ReactNode }, { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) {
    console.warn('[GlassModeSwitcher] crashed, hidden:', err);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function GlassModeSwitcherInner() {
  const { isDesktop, isTouch } = useDeviceType();
  const {
    theme, setTheme, returnToWelcome,
    openGames, closeGames, isGamesOpen,
    isGameActive, callGameBack,
    openMovies, closeMovies, isMoviesOpen,
    isMovieActive, callMovieBack,
    openTv, closeTv, isTvOpen,
    isTvActive, callTvBack,
    isRetroOpen, openRetro, closeRetro,
    isXpOpen, openXp, closeXp,
    isMusicOpen, openMusic, closeMusic,
    isAccountsOpen, openAccounts, closeAccounts,
  } = useAppContext();
  
  const auth = useAuthOptional();
  const reduceMotion  = useReducedMotion();
  const overlayActive = useOverlayActive();
  const isCinema = isMoviesOpen;

  const [open, setOpen]     = useState(false);
  const [openedBy, setOpenedBy] = useState<'hover' | 'click' | 'shortcut' | null>(null);
  const [avoidOffset, setAvoidOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  // ── التبويب والنشاط ─────────
  const [isTabVisible, setIsTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ── السحب وحفظ الإحداثيات ─────────
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const saved = localStorage.getItem('nl:gs:pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isDesk = window.innerWidth >= 1024;
        if (parsed.device === (isDesk ? 'desktop' : 'mobile')) {
          return { x: parsed.x, y: parsed.y };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved position', e);
    }
    return { x: 0, y: 0 };
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const isInteractingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const anchorRef  = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const scheduleIdleCollapse = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    const delay = isDesktop ? 1000 : 5000;
    idleTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, delay);
  }, [isDesktop]);

  const keepAlive = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // ── تشغيل الموسيقى والنشاط الجزيري (Live Activities) ─────────
  const { currentTrack, isPlaying: musicIsPlaying, togglePlay, next, prev } = useNowPlaying();
  const isMusicActive = !!currentTrack && musicIsPlaying;

  const isPlaying = useSyncExternalStore(
    (cb) => {
      const unsubs = SOURCES.map((s) => audioManager.subscribeState(s, cb));
      return () => unsubs.forEach((u) => u && u());
    },
    () => SOURCES.some((s) => audioManager.isSourceActive(s)),
    () => false,
  );

  const triggerVibrate = useCallback(() => {
    if (isTouch && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Ignored
      }
    }
  }, [isTouch]);

  // إغلاق تلقائي عند النقر خارج السطح (الهواتف والأجهزة اللوحية)
  useEffect(() => {
    if (!open || isDesktop) return;
    const onDown = (e: PointerEvent) => {
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, isDesktop]);

  // إزاحة ذكية لتجنّب أزرار الإغلاق (معدلة للأداء الفائق)
  const measureAvoid = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    let dx = 0, dy = 0;
    document.querySelectorAll<HTMLElement>(AVOID_SELECTOR).forEach((a) => {
      const r = a.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const ox = Math.min(base.right, r.right)   - Math.max(base.left, r.left);
      const oy = Math.min(base.bottom, r.bottom) - Math.max(base.top,  r.top);
      if (ox > 0 && oy > 0) {
        dx = Math.min(dx, -(ox + 14));
        dy = Math.max(dy, oy + 14);
      }
    });
    const clamped = clampOffset(base, dx, dy, window.innerWidth, window.innerHeight);
    setAvoidOffset((prev) =>
      prev.x === clamped.x && prev.y === clamped.y ? prev : clamped
    );
  }, []);

  useEffect(() => {
    measureAvoid();

    let resizeFrameId: number;
    const handleResize = () => {
      cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(measureAvoid);
    };

    window.addEventListener('resize', handleResize);

    const obs = new MutationObserver(() => {
      requestAnimationFrame(measureAvoid);
    });
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-modal-context'],
    });

    return () => {
      cancelAnimationFrame(resizeFrameId);
      window.removeEventListener('resize', handleResize);
      obs.disconnect();
    };
  }, [open, overlayActive, measureAvoid]);

  // اختصار لوحة المفاتيح Shift+M لفتح/إغلاق المبدّل
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => {
          const nextState = !prev;
          if (nextState) {
            setOpenedBy('shortcut');
            triggerVibrate();
          }
          return nextState;
        });
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [triggerVibrate]);

  // التركيز التلقائي لمدخل البحث عند تفعيل الاختصار
  useEffect(() => {
    if (open) {
      if (openedBy === 'shortcut' || openedBy === 'click') {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [open, openedBy]);

  const toggleAudio = useCallback(() => {
    const active = SOURCES.find((s) => audioManager.isSourceActive(s));
    if (active) {
      audioManager.pause(active);
      return;
    }
    const src = isGamesOpen ? 'games' : isMoviesOpen ? 'movies' : isTvOpen ? 'tv' : isRetroOpen ? 'retro' : 'bg';
    (audioManager.play as any)(src).catch(() => {
      try { audioManager.armUserGestureResume(); } catch {}
    });
  }, [isGamesOpen, isMoviesOpen, isTvOpen, isRetroOpen]);

  // التعامل مع السحب (Pointer Drag)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (state === 'open') return;
    if (e.button !== 0) return; // Left click/primary touch only
    e.currentTarget.setPointerCapture(e.pointerId);
    isInteractingRef.current = true;
    setIsInteracting(true);
    wasDraggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { x: dragOffset.x, y: dragOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isInteractingRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (!wasDraggingRef.current && Math.hypot(dx, dy) > 6) {
      wasDraggingRef.current = true;
    }
    if (wasDraggingRef.current) {
      setDragOffset({
        x: offsetStartRef.current.x + dx,
        y: offsetStartRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isInteractingRef.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isInteractingRef.current = false;
    setIsInteracting(false);

    if (wasDraggingRef.current) {
      const isDesk = window.innerWidth >= 1024;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let finalX = dragOffset.x;
      let finalY = dragOffset.y;

      const el = anchorRef.current;
      if (el) {
        const base = el.getBoundingClientRect();
        if (isDesk) {
          const clamped = clampOffset(base, dragOffset.x, dragOffset.y, vw, vh);
          finalX = clamped.x;
          finalY = clamped.y;
        } else {
          const rect = surfaceRef.current?.getBoundingClientRect();
          if (rect) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const snapLeft = centerX < vw / 2;
            const snapTop = centerY < vh / 2;
            const margin = 16;
            finalX = snapLeft ? -(vw - rect.width - margin * 2) : 0;
            finalY = snapTop ? -(vh - rect.height - margin * 2) : 0;
          }
        }
      }
      setDragOffset({ x: finalX, y: finalY });
      try {
        localStorage.setItem('nl:gs:pos', JSON.stringify({
          x: finalX,
          y: finalY,
          device: isDesk ? 'desktop' : 'mobile'
        }));
      } catch (err) {
        console.warn('Failed to save position', err);
      }
    }
  };

  // المظهر الفرعي والوجهات حسب محرك البحث والألياس
  const filteredModes = MODES.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    if (m.label.toLowerCase().includes(q)) return true;
    const aliases = ARABIC_ALIASES[m.id];
    return aliases && aliases.some((alias) => alias.toLowerCase().includes(q));
  });

  const DESTINATIONS = [
    {
      id: 'games',
      label: 'Games',
      ariaLabel: isGamesOpen ? 'Close games' : 'Games',
      title: 'Games',
      icon: <Gamepad2 size={16} />,
      isActive: isGamesOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isGamesOpen) closeGames();
        else { openGames(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'cinema',
      label: 'Cinema',
      ariaLabel: isMoviesOpen ? 'Close Cinema' : 'Cinema',
      title: 'Cinema & Movies',
      icon: <Film size={16} />,
      isActive: isMoviesOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isTvOpen) closeTv();
        if (isMoviesOpen) closeMovies();
        else { openMovies(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'tv',
      label: 'TV',
      ariaLabel: isTvOpen ? 'Close TV' : 'TV',
      title: 'TV & Live Stream',
      icon: <Tv size={16} />,
      isActive: isTvOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isRetroOpen) closeRetro();
        else { openTv(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'retro',
      label: 'Retro',
      ariaLabel: isRetroOpen ? 'Close Retro' : 'Retro',
      title: 'Classic Games',
      icon: <Joystick size={16} />,
      isActive: isRetroOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isRetroOpen) closeRetro();
        else { openRetro(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'xp',
      label: 'Windows XP',
      ariaLabel: isXpOpen ? 'Close Windows XP' : 'Windows XP',
      title: 'Windows Desktop',
      icon: <Monitor size={16} />,
      isActive: isXpOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isRetroOpen) closeRetro();
        if (isXpOpen) closeXp();
        else { openXp(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'music',
      label: 'Music',
      ariaLabel: isMusicOpen ? 'Close Music' : 'Music',
      title: 'Music Player',
      icon: <AudioLines size={16} />,
      isActive: isMusicOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isRetroOpen) closeRetro();
        if (isXpOpen) closeXp();
        if (isMusicOpen) closeMusic();
        else { openMusic(); setOpen(false); }
        triggerVibrate();
      }
    },
    {
      id: 'accounts',
      label: 'Accounts',
      ariaLabel: isAccountsOpen ? 'Close Accounts' : 'Accounts',
      title: 'User Directory',
      icon: <Users size={16} />,
      isActive: isAccountsOpen,
      onClick: (e: any) => {
        e.stopPropagation();
        if (isGamesOpen) closeGames();
        if (isMoviesOpen) closeMovies();
        if (isTvOpen) closeTv();
        if (isRetroOpen) closeRetro();
        if (isXpOpen) closeXp();
        if (isMusicOpen) closeMusic();
        if (isAccountsOpen) closeAccounts();
        else { openAccounts(); setOpen(false); }
        triggerVibrate();
      }
    },
  ];

  const filteredDestinations = DESTINATIONS.filter((d) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    if (d.label.toLowerCase().includes(q)) return true;
    const aliases = ARABIC_ALIASES[d.id];
    return aliases && aliases.some((alias) => alias.toLowerCase().includes(q));
  });

  // قائمة العناصر القابلة للتنقل بالكيبورد (Roving TabIndex)
  const isSearchInputVisible = openedBy !== 'hover' || searchQuery !== '';
  const visibleItemIds = [
    ...(isSearchInputVisible ? ['search-input'] : []),
    ...filteredModes.map((m) => `mode-${m.id}`),
    ...filteredDestinations.map((d) => `dest-${d.id}`),
    ...(isGameActive ? ['back-game'] : []),
    ...(isMovieActive ? ['back-movie'] : []),
    ...(isTvActive ? ['back-tv'] : []),
    ...(auth?.user ? ['profile-btn'] : []),
    'sound-or-transport',
    'exit-btn',
  ];

  // تصفّح قائمة الأفلام دون تشغيل فعلي يجب ألّا يُخفي الفقاعة
  const browsingCinema = isMoviesOpen && !isMovieActive;
  const shouldShrink =
    (overlayActive || isGameActive || isMovieActive || isTvActive) &&
    !browsingCinema;
  const state: 'dot' | 'orb' | 'open' = open ? 'open' : shouldShrink ? 'dot' : 'orb';

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.9 };

  // التبويب والتركيز الذكي (Roving Focus Handling)
  const handleFocus = (id: string) => {
    const idx = visibleItemIds.indexOf(id);
    if (idx !== -1) setFocusedIndex(idx);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      surfaceRef.current?.focus();
      return;
    }

    if (state !== 'open') return;

    // تفعيل البحث الفوري عند الكتابة العفوية في وضع سطح المكتب التحليقي
    if (openedBy === 'hover' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setOpenedBy('click');
      setSearchQuery(e.key);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return;
    }

    const currentId = visibleItemIds[focusedIndex];
    const isSearchInputFocused = currentId === 'search-input';
    const cols = isDesktop ? 4 : 2;
    let nextIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = (focusedIndex + 1) % visibleItemIds.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = (focusedIndex - 1 + visibleItemIds.length) % visibleItemIds.length;
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (isSearchInputFocused) {
          nextIndex = 1;
        } else {
          nextIndex = focusedIndex + cols;
          if (nextIndex >= visibleItemIds.length) {
            nextIndex = nextIndex % cols;
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = focusedIndex - cols;
        if (nextIndex < 0) {
          nextIndex = (Math.floor((visibleItemIds.length - 1) / cols) * cols) + (focusedIndex % cols);
          if (nextIndex >= visibleItemIds.length) {
            nextIndex -= cols;
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = visibleItemIds.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex !== focusedIndex && nextIndex >= 0 && nextIndex < visibleItemIds.length) {
      setFocusedIndex(nextIndex);
      const targetId = visibleItemIds[nextIndex];
      const targetEl = surfaceRef.current?.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement;
      targetEl?.focus();
    }
  };

  const getTabIndex = (id: string) => {
    const idx = visibleItemIds.indexOf(id);
    if (idx === -1) return -1;
    return idx === focusedIndex ? 0 : -1;
  };

  const getSection = () => {
    if (isMoviesOpen) return 'cinema';
    if (isMusicOpen) return 'music';
    if (isGamesOpen) return 'games';
    if (isRetroOpen) return 'retro';
    if (isTvOpen) return 'tv';
    if (isXpOpen) return 'xp';
    if (isAccountsOpen) return 'accounts';
    return 'bg';
  };

  const section = getSection();
  const skin = theme;

  const totalX = dragOffset.x + avoidOffset.x;
  const totalY = dragOffset.y + avoidOffset.y;

  const lightPanel = theme === 'light' || theme === 'lite' || theme === 'bit';
  const fgVars = {
    ['--gs-fg' as string]:      lightPanel ? '#10131c' : '#ffffff',
    ['--gs-fg-dim' as string]:  lightPanel ? 'rgba(16,19,28,0.62)' : 'rgba(255,255,255,0.62)',
    ['--gs-fg-faint' as string]: lightPanel ? 'rgba(16,19,28,0.42)' : 'rgba(255,255,255,0.42)',
    // لون سطري مضمون (لا يعتمد على Tailwind ولا على كاش ملفات CSS في AI Studio)
    color: lightPanel ? '#10131c' : '#ffffff',
  } as React.CSSProperties;

  return createPortal(
    <div
      ref={anchorRef}
      className="glass-switcher-anchor"
      data-device={isDesktop ? 'desktop' : 'mobile'}
      data-music-active={isMusicOpen || !!currentTrack}
    >
      <motion.div
        ref={surfaceRef}
        layout
        data-state={state}
        data-section={section}
        data-theme-skin={skin}
        data-live={isMusicActive ? "true" : "false"}
        data-hidden={!isTabVisible ? "true" : "false"}
        data-animating={(isInteracting || open) ? "true" : "false"}
        className={`glass-switcher ${isDesktop ? 'is-desktop' : 'is-mobile'}${isCinema ? ' is-cinema' : ''}${isInteracting ? ' is-interacting' : ''}`}
        animate={{ x: totalX, y: totalY }}
        transition={spring}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => {
          if (isDesktop) {
            keepAlive();
            setOpen(true);
            setOpenedBy('hover');
          }
        }}
        onMouseLeave={() => {
          if (isDesktop) {
            scheduleIdleCollapse();
          }
        }}
        onPointerMoveCapture={() => {
          if (isDesktop) {
            keepAlive();
            if (!open) { setOpen(true); setOpenedBy('hover'); }
          } else if (open) {
            scheduleIdleCollapse();
          }
        }}
        onClick={() => {
          if (wasDraggingRef.current) return;
          if (!isDesktop) {
            setOpen((v) => !v);
            setOpenedBy('click');
            scheduleIdleCollapse();
            triggerVibrate();
          } else {
            keepAlive();
            setOpen(true);
            setOpenedBy('click');
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={state === 'open'}
        aria-keyshortcuts="Shift+M"
        aria-label="Mode switcher"
        onKeyDown={handleKeyDown}
      >
        <span className="glass-switcher__smoke" style={state === 'open' ? { opacity: 0 } : undefined} aria-hidden="true" />
        <span className="glass-switcher__marble" style={state === 'open' ? { opacity: 0 } : undefined} aria-hidden="true" />
        <span className="glass-switcher__sheen" style={state === 'open' ? { opacity: 0 } : undefined} aria-hidden="true" />

        {isCinema && state !== 'open' && !isMusicActive && (
          <Film className="glass-switcher__cine-icon" size={state === 'dot' ? 11 : 22} aria-hidden="true" />
        )}

        {/* الجزيرة الحية: Equalizer + Track Title */}
        {isMusicActive && state === 'orb' && (
          <>
            <div className="gs-equalizer">
              <span className="gs-eq-bar bar-1" />
              <span className="gs-eq-bar bar-2" />
              <span className="gs-eq-bar bar-3" />
            </div>
            <span className="gs-live-title">{currentTrack?.title}</span>
          </>
        )}

        <AnimatePresence>
          {state === 'open' && (
            <motion.div
              key="expanded-panel"
              style={fgVars}
              className="flex flex-col w-full gap-4 text-[color:var(--gs-fg)]"
              role="menu"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduceMotion   ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            >
              {/* 1. Profile Circle (كبير وواضح) */}
              <div className="flex items-center gap-3.5 border-b border-white/10 pb-3" dir="ltr">
                <div className="w-14 h-14 rounded-full border border-white/20 bg-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-lg relative">
                  <span className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/15 pointer-events-none" />
                  {auth?.user?.user_metadata?.avatar_url || auth?.user?.user_metadata?.picture ? (
                    <img
                      src={auth?.user?.user_metadata?.avatar_url || auth?.user?.user_metadata?.picture}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={24} className="text-[color:var(--gs-fg-dim)]" />
                  )}
                </div>
                <div className="flex-grow min-w-0 text-left">
                  <div className="font-bold text-sm text-[color:var(--gs-fg)] truncate">
                    {auth?.user?.user_metadata?.display_name || auth?.user?.user_metadata?.full_name || (auth?.user ? 'NL User' : 'Guest')}
                  </div>
                  <div className="text-[10px] text-[color:var(--gs-fg-faint)] truncate mt-0.5">
                    {auth?.user ? auth.user.email : 'Not logged in'}
                  </div>
                </div>
              </div>

              {/* 2. Login / Account Button */}
              <div className="w-full">
                {auth?.user ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      auth.openProfile();
                      triggerVibrate();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-[color:var(--gs-fg)] hover:bg-white/15 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer text-center"
                    data-nav-id="profile-btn"
                    tabIndex={getTabIndex('profile-btn')}
                    onFocus={() => handleFocus('profile-btn')}
                  >
                    Account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      auth?.openAuthModal();
                      triggerVibrate();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl backdrop-blur-md bg-gradient-to-r from-[#FF7A1A]/90 to-[#00E676]/90 border border-white/20 text-white hover:opacity-90 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer text-center"
                    data-nav-id="login-btn"
                    tabIndex={getTabIndex('login-btn')}
                    onFocus={() => handleFocus('login-btn')}
                  >
                    Log in
                  </button>
                )}
              </div>

              {/* 3. Modes Section (المظاهر) */}
              <div className="flex flex-col gap-1.5" dir="ltr">
                <div className="text-[10px] font-bold text-[color:var(--gs-fg-faint)] uppercase tracking-wider text-left pl-1">
                  Modes
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => {
                    const IconComp = m.icon;
                    const isActive = theme === m.id;
                    const itemId = `mode-${m.id}`;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTheme(m.id);
                          setOpen(false);
                          triggerVibrate();
                        }}
                        className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all text-[10px] leading-tight text-[color:var(--gs-fg)] cursor-pointer ${
                          isActive
                            ? 'bg-[#00E676]/20 border-[#00E676]/40 shadow-[0_4px_12px_rgba(0,230,118,0.22)] font-bold'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                        data-nav-id={itemId}
                        tabIndex={getTabIndex(itemId)}
                        onFocus={() => handleFocus(itemId)}
                      >
                        <IconComp size={15} className={isActive ? 'text-[#00E676]' : 'text-[color:var(--gs-fg-dim)]'} />
                        <span className="truncate max-w-full px-1">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Destinations Section (الوجهات) */}
              <div className="flex flex-col gap-1.5" dir="ltr">
                <div className="text-[10px] font-bold text-[color:var(--gs-fg-faint)] uppercase tracking-wider text-left pl-1">
                  Destinations
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DESTINATIONS.map((d) => {
                    const isActive = d.isActive;
                    const itemId = `dest-${d.id}`;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="menuitem"
                        onClick={d.onClick}
                        className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all text-[10px] leading-tight text-[color:var(--gs-fg)] cursor-pointer ${
                          isActive
                            ? 'bg-[#FF7A1A]/20 border-[#FF7A1A]/40 shadow-[0_4px_12px_rgba(255,122,26,0.22)] font-bold'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                        data-nav-id={itemId}
                        tabIndex={getTabIndex(itemId)}
                        onFocus={() => handleFocus(itemId)}
                      >
                        <div className={isActive ? 'text-[#FF7A1A]' : 'text-[color:var(--gs-fg-dim)]'}>
                          {d.icon}
                        </div>
                        <span className="truncate max-w-full px-1">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sleek Footer Bottom Controls */}
              <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1 w-full" dir="ltr">
                <div className="flex items-center gap-2">
                  {/* Back buttons */}
                  {isGameActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        callGameBack();
                        setOpen(false);
                        triggerVibrate();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                      title="Back to games"
                      data-nav-id="back-game"
                      tabIndex={getTabIndex('back-game')}
                      onFocus={() => handleFocus('back-game')}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {isMovieActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        callMovieBack();
                        setOpen(false);
                        triggerVibrate();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                      title="Back to movies"
                      data-nav-id="back-movie"
                      tabIndex={getTabIndex('back-movie')}
                      onFocus={() => handleFocus('back-movie')}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {isTvActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        callTvBack();
                        setOpen(false);
                        triggerVibrate();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                      title="Back to TV list"
                      data-nav-id="back-tv"
                      tabIndex={getTabIndex('back-tv')}
                      onFocus={() => handleFocus('back-tv')}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {currentTrack ? (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-xl" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={prev}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                        title="Prev"
                      >
                        <SkipBack size={12} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                        title={musicIsPlaying ? "Pause" : "Play"}
                      >
                        {musicIsPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      </button>
                      <button
                        onClick={next}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                        title="Next"
                      >
                        <SkipForward size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAudio();
                        triggerVibrate();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[color:var(--gs-fg)] transition-all cursor-pointer"
                      title="Mute"
                      data-nav-id="sound-or-transport"
                      tabIndex={getTabIndex('sound-or-transport')}
                      onFocus={() => handleFocus('sound-or-transport')}
                    >
                      {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      returnToWelcome();
                      triggerVibrate();
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                    title="Exit"
                    data-nav-id="exit-btn"
                    tabIndex={getTabIndex('exit-btn')}
                    onFocus={() => handleFocus('exit-btn')}
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}

export function GlassModeSwitcher() {
  return (
    <GlassSwitcherBoundary>
      <GlassModeSwitcherInner />
    </GlassSwitcherBoundary>
  );
}

export default GlassModeSwitcher;
