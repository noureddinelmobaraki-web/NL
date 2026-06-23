import {
  Component, useCallback, useEffect, useRef, useState,
  useSyncExternalStore, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX, LogOut, Gamepad2, ChevronLeft, Film, Tv, Joystick } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useDeviceType } from '../../hooks/useDeviceType';
import { audioManager } from '../../audio/audioManager';
import type { Theme } from '../../utils/userPrefs';
import '../../styles/components/glass-switcher.css';

const MODES: { id: Theme; label: string }[] = [
  { id: 'dark',     label: 'Dark'     },
  { id: 'light',    label: 'Light'    },
  { id: 'midnight', label: 'Midnight' },
  { id: 'bit',      label: 'Bit'      },
  { id: 'lite',     label: 'Lite'     },
];

const SOURCES = ['bg', 'song', 'lens', 'mebit', 'video', 'intro', 'games', 'movies', 'series'] as const;

const AVOID_SELECTOR =
  '[data-glass-avoid],[aria-label="Close"],[aria-label="إغلاق"],.modal-close-btn,.gallery-close-btn';

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
  const { isDesktop } = useDeviceType();
  const {
    theme, setTheme, returnToWelcome,
    openGames, closeGames, isGamesOpen,
    isGameActive, callGameBack,
    openMovies, closeMovies, isMoviesOpen,
    isMovieActive, callMovieBack,
    openTv, closeTv, isTvOpen,
    isTvActive, callTvBack,
    isRetroOpen, openRetro, closeRetro,
  } = useAppContext();
  const reduceMotion  = useReducedMotion();
  const overlayActive = useOverlayActive();
  const isCinema = isMoviesOpen;

  const [open, setOpen]     = useState(false);
  const [peek, setPeek]     = useState(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const anchorRef  = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const scheduleIdleCollapse = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    // الهاتف 5 ثوانٍ ثم يغلق، الحاسوب ثانية واحدة بعد المغادرة
    const delay = isDesktop ? 1000 : 5000;
    idleTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPeek(false);
    }, delay);
  }, [isDesktop]);

  const keepAlive = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // ── مؤشر تشغيل الصوت: يشمل 'games' لعكس حالة موسيقى الألعاب
  const isPlaying = useSyncExternalStore(
    (cb) => {
      const unsubs = SOURCES.map((s) => audioManager.subscribeState(s, cb));
      return () => unsubs.forEach((u) => u && u());
    },
    () => SOURCES.some((s) => audioManager.isSourceActive(s)),
    () => false,
  );

  useEffect(() => {
    if (!overlayActive) setPeek(false);
  }, [overlayActive]);

  // إزاحة ذكية لتجنّب أزرار الإغلاق
  useEffect(() => {
    const measure = () => {
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
      setOffset((prev) =>
        prev.x === clamped.x && prev.y === clamped.y ? prev : clamped
      );
    };
    measure();
    const obs = new MutationObserver(measure);
    obs.observe(document.body, {
      attributes: true, childList: true, subtree: true,
      attributeFilter: ['class', 'data-modal-context', 'style'],
    });
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 600);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, [open, overlayActive]);

  // المؤقت الذكي: مخصص للهاتف، وتوقيفه على الحاسوب إلا عند المغادرة
  useEffect(() => {
    if (!open && !peek) {
      keepAlive();
    } else if (!isDesktop) {
      scheduleIdleCollapse();
    }
  }, [open, peek, isDesktop, keepAlive, scheduleIdleCollapse]);

  // إغلاق عند النقر خارجها (هاتف)
  useEffect(() => {
    if (!open || isDesktop) return;
    const onDown = (e: PointerEvent) => {
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPeek(false);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, isDesktop]);

  // ── تبديل الصوت: يتحكم بموسيقى الألعاب أو الأفلام أو المسلسلات حين الفتح ─────────
  const toggleAudio = useCallback(() => {
    const active = SOURCES.find((s) => audioManager.isSourceActive(s));
    if (active) {
      audioManager.pause(active);
      return;
    }
    const src = isGamesOpen ? 'games' : isMoviesOpen ? 'movies' : 'bg';
    (audioManager.play as any)(src).catch(() => {
      try { audioManager.armUserGestureResume(); } catch {}
    });
  }, [isGamesOpen, isMoviesOpen]);

  if (typeof window === 'undefined') return null;
  // ▶ تمت إزالة: if (isGamesOpen) return null;
  // الفقاعة تظهر في كل الأوضاع بما فيها الألعاب

  // ── حالة الفقاعة:
  // - dot  : حين يوجد modal نشط أو لعبة تعمل (isGameActive)
  // - open : حين يكون المستخدم قد فتحها
  // - orb  : الحالة الافتراضية (دائرة صغيرة)
  const shouldShrink = (overlayActive || isGameActive || isMovieActive || isTvActive) && !peek;
  const state: 'dot' | 'orb' | 'open' = open ? 'open' : shouldShrink ? 'dot' : 'orb';

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.9 };

  return createPortal(
    <div ref={anchorRef} className="glass-switcher-anchor">
      <motion.div
        ref={surfaceRef}
        layout
        data-state={state}
        className={`glass-switcher ${isDesktop ? 'is-desktop' : 'is-mobile'}${isCinema ? ' is-cinema' : ''}`}
        animate={{ x: offset.x, y: offset.y }}
        transition={spring}
        onMouseEnter={() => {
          if (isDesktop) {
            keepAlive();
            setOpen(true);
            setPeek(false);
          }
        }}
        onMouseLeave={() => {
          if (isDesktop) {
             scheduleIdleCollapse();
          }
        }}
        onPointerMove={() => { 
          if (isDesktop) {
             keepAlive();
             // Just in case it closed but we're still moving inside
             if (!open) { setOpen(true); setPeek(false); }
          }
          else if (open || peek) scheduleIdleCollapse(); 
        }}
        onClick={() => {
          if (!isDesktop) {
            if (shouldShrink && !peek) setPeek(true);
            else setOpen((v) => !v);
            scheduleIdleCollapse();
          } else {
            keepAlive();
          }
        }}
        role="group"
        aria-label="Mode switcher"
      >
        <span className="glass-switcher__smoke" aria-hidden="true" />
        <span className="glass-switcher__sheen" aria-hidden="true" />

        {isCinema && state !== 'open' && (
          <Film className="glass-switcher__cine-icon" size={state === 'dot' ? 11 : 22} aria-hidden="true" />
        )}

        <AnimatePresence>
          {state === 'open' && (
            <motion.div
              key="grid"
              className="glass-switcher__grid"
              role="menu"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduceMotion   ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            >
              {/* أزرار الأوضاع — تُغلق الألعاب والتلفزيون أولاً إن كانت مفتوحة */}
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={!isGamesOpen && !isTvOpen && theme === m.id}
                  className={`gs-cell ${!isGamesOpen && !isTvOpen && theme === m.id ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGamesOpen) closeGames();
                    if (isMoviesOpen) closeMovies();
                    if (isTvOpen) closeTv();
                    setTheme(m.id);
                    setOpen(false);
                  }}
                >
                  {m.label}
                </button>
              ))}

              <div className="glass-switcher__features-grid">
                {/* زر الألعاب: يفتح أو يغلق الصفحة */}
                <button
                  type="button"
                  className={`gs-cell gs-icon${isGamesOpen ? ' is-active' : ''}`}
                  role="menuitem"
                  aria-label={isGamesOpen ? 'Close games' : 'Games'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMoviesOpen) closeMovies();
                    if (isTvOpen) closeTv();
                    if (isGamesOpen) closeGames();
                    else { openGames(); setOpen(false); }
                  }}
                >
                  <Gamepad2 size={16} />
                </button>

                {/* زر الأفلام والمسلسلات: يفتح أو يغلق الصفحة */}
                <button
                  type="button"
                  className={`gs-cell gs-icon${isMoviesOpen ? ' is-active' : ''}`}
                  role="menuitem"
                  aria-label={isMoviesOpen ? 'Close Cinema' : 'Cinema'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGamesOpen) closeGames();
                    if (isTvOpen) closeTv();
                    if (isMoviesOpen) closeMovies();
                    else { openMovies(); setOpen(false); }
                  }}
                >
                  <Film size={16} />
                </button>

                {/* زر التلفزيون: يفتح أو يغلق الصفحة */}
                <button
                  type="button"
                  className={`gs-cell gs-icon${isTvOpen ? ' is-active' : ''}`}
                  role="menuitem"
                  aria-label={isTvOpen ? 'Close TV' : 'TV'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGamesOpen) closeGames();
                    if (isMoviesOpen) closeMovies();
                    if (isTvOpen) closeTv();
                    if (isRetroOpen) closeRetro();
                    else { openTv(); setOpen(false); }
                  }}
                >
                  <Tv size={16} />
                </button>

                {/* زر ريترو: يفتح أو يغلق الصفحة */}
                <button
                  type="button"
                  className={`gs-cell gs-icon${isRetroOpen ? ' is-active' : ''}`}
                  role="menuitem"
                  aria-label={isRetroOpen ? 'Close Retro' : 'Retro'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGamesOpen) closeGames();
                    if (isMoviesOpen) closeMovies();
                    if (isTvOpen) closeTv();
                    if (isRetroOpen) closeRetro();
                    else { openRetro(); setOpen(false); }
                  }}
                >
                  <Joystick size={16} />
                </button>
              </div>

              {/* زر إغلاق اللعبة (← العودة للقائمة) — يظهر فقط حين لعبة نشطة أو فيلم نشط */}
              {isGameActive && (
                <button
                  type="button"
                  className="gs-cell gs-icon"
                  role="menuitem"
                  aria-label="Back to game list"
                  onClick={(e) => {
                    e.stopPropagation();
                    callGameBack();
                    setOpen(false);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {isMovieActive && (
                <button
                  type="button"
                  className="gs-cell gs-icon"
                  role="menuitem"
                  aria-label="Back to movie list"
                  onClick={(e) => {
                    e.stopPropagation();
                    callMovieBack();
                    setOpen(false);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {isTvActive && (
                <button
                  type="button"
                  className="gs-cell gs-icon"
                  role="menuitem"
                  aria-label="Back to TV list"
                  onClick={(e) => {
                    e.stopPropagation();
                    callTvBack();
                    setOpen(false);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* زر الصوت */}
              <button
                type="button"
                className="gs-cell gs-icon"
                aria-label="Sound"
                onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
              >
                {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* زر الخروج */}
              <button
                type="button"
                className="gs-cell gs-icon gs-exit"
                aria-label="Exit"
                onClick={(e) => { e.stopPropagation(); returnToWelcome(); }}
              >
                <LogOut size={16} />
              </button>
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
