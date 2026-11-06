import {
  Component,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LogOut,
  Volume2,
  VolumeX,
  UserRound,
  Square,
  X,
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useAuthOptional } from "../../context/AuthContext";
import { audioManager } from "../../audio/audioManager";
import type { Theme } from "../../utils/userPrefs";
import {
  MODES,
  PAGE_META,
  buildNotchDestinations,
  type PageKey,
} from "./notch.constants";
import { useNowPlayingNotch } from "./hooks/useNowPlayingNotch";
import { useNotchMode } from "./hooks/useNotchVisibility";
import { useSwitcherState } from "./hooks/useSwitcherState";
import { useSwitcherDrag } from "./hooks/useSwitcherDrag";
import { useDeviceLayout } from "./hooks/useDeviceLayout";
import { useOutsideClose } from "./hooks/useOutsideClose";
import { useIdleCollapse } from "./hooks/useIdleCollapse";
import { useThemeSkin } from "./hooks/useThemeSkin";
import { useBackdropDim } from "./hooks/useBackdropDim";
import { useAudioConflict } from "./hooks/useAudioConflict";
import { useSongSurface } from "../../audio/songSurfaceBus";
import { NotchLivePill } from "./NotchLivePill";
import { SwitcherPanel } from "./SwitcherPanel";

class Boundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[NotchIsland] hidden:", err);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function NotchIslandInner() {
  const ctx = useAppContext();
  const {
    theme,
    setTheme,
    returnToWelcome,
    navigateTo,
    openGames,
    closeGames,
    isGamesOpen,
    openMovies,
    closeMovies,
    isMoviesOpen,
    isSeriesOpen,
    openTv,
    closeTv,
    isTvOpen,
    isRetroOpen,
    openRetro,
    closeRetro,
    isXpOpen,
    openXp,
    closeXp,
    isMusicOpen,
    openMusic,
    closeMusic,
    isAccountsOpen,
    openAccounts,
    closeAccounts,
    isLiquidGlassOpen,
  } = ctx;

  const auth = useAuthOptional();
  const reduceMotion = useReducedMotion();
  const { device, isDesktop, isTouch } = useDeviceLayout();
  const isMobile = !isDesktop;
  const transport = useNowPlayingNotch();
  const onSongSurface = useSongSurface();
  const { lightPanel } = useThemeSkin(theme);

  const muted = useSyncExternalStore(
    (cb) => audioManager.subscribeMuted(cb),
    () => audioManager.isMuted(),
    () => false,
  );

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const { open, branch, toggle, close, openPanel, selectBranch } =
    useSwitcherState();
  const {
    offset,
    dragging,
    autoDodging,
    movedRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useSwitcherDrag({ disabled: open, isMobile, surfaceRef });
  const { schedule, keepAlive } = useIdleCollapse({
    open,
    isDesktop,
    onCollapse: close,
  });
  // إغلاق النافذة عند النقر خارجها (كل الأجهزة) بدل الإغلاق التلقائي عند مغادرة المؤشّر → يقتل "الإغلاق المفاجئ".
  useOutsideClose({ enabled: open, rootRef: anchorRef, onClose: close });
  // تعتيم الخلفية عند فتح النافذة (في الهاتف يصبح معتماً داكناً لتركيز الانتباه على مركز التحكم).
  useBackdropDim(open, {
    opacity: isMobile ? 0.86 : 0.42,
    ms: reduceMotion ? 0 : 220,
    color: isMobile ? "#020306" : "#070b0f",
  });

  // مؤقّت الانطواء يبدأ عند الفتح ويُصفَّر مع أي تفاعل → لا تُغلق النافذة أثناء الاستخدام.
  useEffect(() => {
    if (open) schedule();
    else keepAlive();
  }, [open, schedule, keepAlive]);

  // الرؤية: حية فقط عندما توجد أغنية song تعمل فعلًا (isPlaying) → يقتل خطأ "تظهر عند الدخول" و"لا تنكمش عند الإيقاف".
  const hasSong = !!transport && transport.isPlaying;
  const mode = useNotchMode({ hasSong });
  const state: "orb" | "live" | "open" = open
    ? "open"
    : mode === "live"
      ? "live"
      : "orb";

  const pageKey: PageKey = isGamesOpen
    ? "games"
    : isMoviesOpen || isSeriesOpen
      ? "cinema"
      : isTvOpen
        ? "tv"
        : isRetroOpen
          ? "retro"
          : isXpOpen
            ? "xp"
            : isMusicOpen
              ? "music"
              : isAccountsOpen
                ? "accounts"
                : isLiquidGlassOpen
                  ? "liquidGlass"
                  : "home";
  const pageMeta = PAGE_META[pageKey];
  const OrbIcon = pageMeta.icon;
  const accent = pageMeta.accent;

  // حلّال تعارض الصوت: يكشف تراكب الأغنية مع خلفية الصفحة عند الانتقال ويعرض التفرّع.
  const conflict = useAudioConflict();

  const vibrate = useCallback(() => {
    if (isTouch && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* ignore */
      }
    }
  }, [isTouch]);

  // اختصار Shift+M
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.shiftKey && (e.key === "M" || e.key === "m"))) return;
      const el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable
      )
        return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [toggle]);

  // نموذج التنقّل: صفحة نشطة واحدة فقط، لذا openFn(الوجهة) يستبدل الصفحة الحالية مباشرة.
  // إصلاح الجذر: كان closeAllSections() يُشعل قفل الانتقال (transitioning) في المخفّض،
  // فيُتجاهَل openFn() التالي فترجع للهوم. الحل: انتقال مباشر بنداء واحد.
  const goto =
    (isActive: boolean, openFn: () => void, closeFn: () => void) => () => {
      if (isActive) closeFn();
      else openFn();
      close();
      vibrate();
    };

  // Home: صفحة رئيسية مستقلة. تُغلق كل الأقسام (navigateTo('home')) وتُطبَّق سِمة الهوم الافتراضية (midnight).
  const goHome = () => {
    navigateTo("home");
    setTheme("midnight");
    close();
    vibrate();
  };

  const DESTINATIONS = buildNotchDestinations({
    pageKey,
    goHome,
    goto,
    isGamesOpen,
    openGames,
    closeGames,
    isMoviesOpen,
    openMovies,
    closeMovies,
    isTvOpen,
    openTv,
    closeTv,
    isRetroOpen,
    openRetro,
    closeRetro,
    isXpOpen,
    openXp,
    closeXp,
    isMusicOpen,
    openMusic,
    closeMusic,
    isAccountsOpen,
    openAccounts,
    closeAccounts,
  });

  const collapsedMobileState: "orb" | "live" =
    mode === "live" ? "live" : "orb";
  const islandState: "orb" | "live" | "open" = isMobile
    ? collapsedMobileState
    : state;

  const styleVars = {
    ["--notch-accent" as string]: accent,
    transform: `translate3d(${offset.x}px, ${isMobile ? 0 : offset.y}px, 0)`,
  } as React.CSSProperties;

  const surfaceTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 410, damping: 26, mass: 0.82 };
  const panelInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.88, y: -6 };
  const panelAnimate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, y: 0 };
  const panelExit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.9, y: -4 };
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 440, damping: 28, mass: 0.72 };

  const handleModeSelect = (id: Theme) => {
    const nextTheme: Theme = theme === id ? "midnight" : id;
    setTheme(nextTheme);
    close();
    vibrate();
  };

  return createPortal(
    <div
      ref={anchorRef}
      className="notch-portal-root"
      data-device={device}
      data-page={pageKey}
    >
      <div
        className="notch-anchor"
        data-device={device}
        data-page={pageKey}
      >
        <m.div
          ref={surfaceRef}
          data-state={islandState}
          data-cc-open={isMobile && state === "open" ? "true" : "false"}
          data-live={islandState === "live" ? "true" : "false"}
          data-theme-skin={theme}
          data-page={pageKey}
          data-light={lightPanel ? "true" : "false"}
          data-dodging={autoDodging ? "true" : "false"}
          className={`notch-island nl-notch-island ${device === "desktop" ? "is-desktop" : "is-mobile"}${dragging ? " is-dragging" : ""}${autoDodging ? " is-dodging" : ""}`}
          style={styleVars}
          transition={surfaceTransition}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onMouseEnter={() => {
            if (isDesktop) {
              openPanel();
              schedule();
            }
          }}
          onMouseMove={() => {
            if (open) schedule();
          }}
          onClick={() => {
            if (movedRef.current) return;
            if (isDesktop) {
              openPanel();
              schedule();
            } else {
              toggle();
              schedule();
              vibrate();
            }
          }}
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={state === "open"}
          aria-keyshortcuts="Shift+M"
          aria-label="Mode switcher"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
        >
          <span className="notch-island__smoke" aria-hidden="true">
            <span className="notch-island__smoke-wisp notch-island__smoke-wisp--1" />
            <span className="notch-island__smoke-wisp notch-island__smoke-wisp--2" />
            <span className="notch-island__smoke-core" />
          </span>
          <span className="notch-island__gloss" aria-hidden="true" />

          {islandState === "live" &&
            transport &&
            (onSongSurface || transport.hasControls === false ? (
              <NotchLivePill t={transport} onVibrate={vibrate} compact nameOnly />
            ) : (
              <NotchLivePill t={transport} onVibrate={vibrate} />
            ))}

          {islandState === "orb" && (
            <span className="notch-orb" aria-hidden="true">
              <OrbIcon size={18} strokeWidth={2.2} />
            </span>
          )}

          {/* Desktop Expanded Panel */}
          <AnimatePresence>
            {!isMobile && state === "open" && (
              <m.div
                key="panel"
                className="notch-panel"
                role="menu"
                initial={panelInitial}
                animate={panelAnimate}
                exit={panelExit}
                transition={panelTransition}
              >
                <SwitcherPanel
                  modes={MODES}
                  destinations={DESTINATIONS}
                  theme={theme}
                  reduceMotion={!!reduceMotion}
                  isMobile={false}
                  branch={branch}
                  onBranch={selectBranch}
                  onMode={handleModeSelect}
                />
                <div className="notch-panel__footer" dir="ltr">
                  {transport && transport.isPlaying && (
                    <div className="notch-panel__mini">
                      <NotchLivePill t={transport} onVibrate={vibrate} compact />
                    </div>
                  )}
                  <div className="notch-panel__tools">
                    <button
                      type="button"
                      className="notch-tool"
                      aria-pressed={muted}
                      title={muted ? "Unmute" : "Mute"}
                      aria-label={muted ? "Unmute" : "Mute"}
                      onClick={(e) => {
                        e.stopPropagation();
                        audioManager.toggleMuted();
                        vibrate();
                      }}
                    >
                      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button
                      type="button"
                      className="notch-tool"
                      title="Profile"
                      aria-label="Profile"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (auth?.user) auth.openProfile();
                        else auth?.openAuthModal?.();
                        close();
                        vibrate();
                      }}
                    >
                      <UserRound size={16} />
                    </button>
                    <button
                      type="button"
                      className="notch-tool notch-tool--exit"
                      title="Exit"
                      aria-label="Exit"
                      onClick={(e) => {
                        e.stopPropagation();
                        returnToWelcome();
                        vibrate();
                      }}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {conflict.active && state !== "open" && (
          <div className="notch-fork" role="group" aria-label="Audio conflict">
            <button
              type="button"
              className="notch-fork__branch notch-fork__branch--song"
              title={`Silence song: ${transport?.title || "Song"}`}
              aria-label="Silence song"
              onClick={(e) => {
                e.stopPropagation();
                conflict.keepBg();
                vibrate();
              }}
            >
              <span className="notch-fork__label">
                {transport?.title || "Song"}
              </span>
              <span className="notch-fork__icon" aria-hidden="true">
                <VolumeX size={13} />
              </span>
            </button>
            <button
              type="button"
              className="notch-fork__branch notch-fork__branch--bg"
              title="Stop background sound"
              aria-label="Stop background sound"
              onClick={(e) => {
                e.stopPropagation();
                conflict.keepSong();
                vibrate();
              }}
            >
              <span className="notch-fork__icon" aria-hidden="true">
                <Square size={12} />
              </span>
              <span className="notch-fork__label">BG</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Expanded State: Fixed Center-of-Screen 3D Liquid Glass iOS Control Center */}
      <AnimatePresence>
        {isMobile && state === "open" && (
          <m.div
            key="mobile-control-center"
            className="notch-mobile-cc-overlay"
            data-theme-skin={theme}
            data-light={lightPanel ? "true" : "false"}
            style={{ ["--notch-accent" as string]: accent } as React.CSSProperties}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            {/* Full-Screen Dark Dimmed Scrim Behind Control Center */}
            <div
              className="notch-mobile-cc-backdrop"
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                close();
                vibrate();
              }}
            />

            {/* Fixed Centered 3D Liquid Glass iOS Control Center Card */}
            <m.div
              className="notch-mobile-cc-card"
              role="dialog"
              aria-modal="true"
              aria-label="Control Center"
              dir="ltr"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.86, y: 12 }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.9, y: 8 }
              }
              transition={panelTransition}
              onClick={(e) => {
                e.stopPropagation();
                schedule();
              }}
            >
              <span className="notch-island__smoke" aria-hidden="true">
                <span className="notch-island__smoke-wisp notch-island__smoke-wisp--1" />
                <span className="notch-island__smoke-wisp notch-island__smoke-wisp--2" />
                <span className="notch-island__smoke-core" />
              </span>
              <span className="notch-island__gloss" aria-hidden="true" />

              {/* Control Center Top Bar */}
              <div className="notch-cc__header">
                <div className="notch-cc__brand">
                  <span className="notch-cc__brand-orb">
                    <OrbIcon size={15} strokeWidth={2.3} />
                  </span>
                  <div className="notch-cc__brand-text">
                    <span className="notch-cc__brand-title">Control Center</span>
                    <span className="notch-cc__brand-sub">
                      {pageKey.toUpperCase()} • {theme === "midnight" ? "DEFAULT" : theme.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="notch-cc__close"
                  aria-label="Close Control Center"
                  title="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    vibrate();
                  }}
                >
                  <X size={16} strokeWidth={2.4} />
                </button>
              </div>

              {/* Optional Now Playing Module */}
              {transport && transport.isPlaying && (
                <div className="notch-cc__now-playing">
                  <NotchLivePill t={transport} onVibrate={vibrate} compact />
                </div>
              )}

              {/* Modes & Destinations Bento Modules */}
              <SwitcherPanel
                modes={MODES}
                destinations={DESTINATIONS}
                theme={theme}
                reduceMotion={!!reduceMotion}
                isMobile={true}
                branch={branch}
                onBranch={selectBranch}
                onMode={handleModeSelect}
              />

              {/* Quick Action Utility Capsules (Sound / Profile / Exit) */}
              <div className="notch-cc__dock">
                <button
                  type="button"
                  className="notch-cc__dock-btn"
                  aria-pressed={muted}
                  title={muted ? "Unmute" : "Mute"}
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={(e) => {
                    e.stopPropagation();
                    audioManager.toggleMuted();
                    schedule();
                    vibrate();
                  }}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{muted ? "Muted" : "Sound"}</span>
                </button>
                <button
                  type="button"
                  className="notch-cc__dock-btn"
                  title="Profile"
                  aria-label="Profile"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (auth?.user) auth.openProfile();
                    else auth?.openAuthModal?.();
                    close();
                    vibrate();
                  }}
                >
                  <UserRound size={16} />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  className="notch-cc__dock-btn notch-cc__dock-btn--exit"
                  title="Exit"
                  aria-label="Exit"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    returnToWelcome();
                    vibrate();
                  }}
                >
                  <LogOut size={16} />
                  <span>Exit</span>
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export function NotchIsland() {
  return (
    <Boundary>
      <NotchIslandInner />
    </Boundary>
  );
}
export default NotchIsland;
