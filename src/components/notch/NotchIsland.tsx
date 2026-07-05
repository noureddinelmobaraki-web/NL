import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Moon,
  Sun,
  Grid2x2,
  Feather,
  Gamepad2,
  Film,
  Tv,
  Joystick,
  Monitor,
  AudioLines,
  Users,
  LogOut,
  Home,
  Volume2,
  VolumeX,
  UserRound,
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useAuthOptional } from "../../context/AuthContext";
import { audioManager } from "../../audio/audioManager";
import type { Theme } from "../../utils/userPrefs";
import type { SwitcherMode, SwitcherDest } from "./notch.types";
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
import "../../styles/components/notch-aero.css";

const SwitcherPanel = lazy(() => import("./SwitcherPanel"));

// الأوضاع الأربعة: سِمات لصفحة الهوم (midnight = الهوم الافتراضي، لم يعد زر وضع).
const MODES: SwitcherMode[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "bit", label: "Bit", icon: Grid2x2 },
  { id: "lite", label: "Lite", icon: Feather },
];

type PageKey =
  "home" | "games" | "cinema" | "tv" | "retro" | "xp" | "music" | "accounts";

// لكل صفحة أيقونة + لون مميّز → يتغير شكل الأورب المنكمش في كل صفحة.
const PAGE_META: Record<PageKey, { icon: LucideIcon; accent: string }> = {
  home: { icon: Home, accent: "#7fd0ff" },
  games: { icon: Gamepad2, accent: "#8affc1" },
  cinema: { icon: Film, accent: "#ff9fc0" },
  tv: { icon: Tv, accent: "#9ec9ff" },
  retro: { icon: Joystick, accent: "#ffd27f" },
  xp: { icon: Monitor, accent: "#7fd0ff" },
  music: { icon: AudioLines, accent: "#c9a8ff" },
  accounts: { icon: Users, accent: "#8fe3ff" },
};

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
  } = ctx;

  const auth = useAuthOptional();
  const reduceMotion = useReducedMotion();
  const { device, isDesktop, isTouch } = useDeviceLayout();
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
    movedRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useSwitcherDrag({ disabled: open, surfaceRef });
  const { schedule, keepAlive } = useIdleCollapse({
    open,
    isDesktop,
    onCollapse: close,
  });
  // إغلاق النافذة عند النقر خارجها (كل الأجهزة) بدل الإغلاق التلقائي عند مغادرة المؤشّر → يقتل "الإغلاق المفاجئ".
  useOutsideClose({ enabled: open, rootRef: anchorRef, onClose: close });
  // تعتيم تدريجي خفيف للخلفية عند فتح النافذة (بلا بلور، طبقة داكنة شفّافة فقط).
  useBackdropDim(open, { opacity: 0.42, ms: reduceMotion ? 0 : 200 });

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

  const DESTINATIONS: SwitcherDest[] = [
    {
      id: "home",
      label: "Home",
      title: "Home",
      icon: <Home size={16} />,
      isActive: pageKey === "home",
      onClick: goHome,
    },
    {
      id: "games",
      label: "Games",
      title: "Games",
      icon: <Gamepad2 size={16} />,
      isActive: isGamesOpen,
      onClick: goto(isGamesOpen, openGames, closeGames),
    },
    {
      id: "cinema",
      label: "Cinema",
      title: "Cinema & Movies",
      icon: <Film size={16} />,
      isActive: isMoviesOpen,
      onClick: goto(isMoviesOpen, openMovies, closeMovies),
    },
    {
      id: "tv",
      label: "TV",
      title: "TV & Live",
      icon: <Tv size={16} />,
      isActive: isTvOpen,
      onClick: goto(isTvOpen, openTv, closeTv),
    },
    {
      id: "retro",
      label: "Retro",
      title: "Classic Games",
      icon: <Joystick size={16} />,
      isActive: isRetroOpen,
      onClick: goto(isRetroOpen, openRetro, closeRetro),
    },
    {
      id: "xp",
      label: "Windows XP",
      title: "Windows Desktop",
      icon: <Monitor size={16} />,
      isActive: isXpOpen,
      onClick: goto(isXpOpen, openXp, closeXp),
    },
    {
      id: "music",
      label: "Music",
      title: "Music Player",
      icon: <AudioLines size={16} />,
      isActive: isMusicOpen,
      onClick: goto(isMusicOpen, openMusic, closeMusic),
    },
    {
      id: "accounts",
      label: "Accounts",
      title: "User Directory",
      icon: <Users size={16} />,
      isActive: isAccountsOpen,
      onClick: goto(isAccountsOpen, openAccounts, closeAccounts),
    },
  ];

  const styleVars = {
    ["--notch-accent" as string]: accent,
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
  } as React.CSSProperties;

  const surfaceTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.9 };
  const panelInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.94 };
  const panelAnimate = reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 };
  const panelExit = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 };
  const panelTransition = reduceMotion ? { duration: 0 } : { duration: 0.18 };

  return createPortal(
    <div
      ref={anchorRef}
      className="notch-anchor"
      data-device={device}
      data-page={pageKey}
    >
      <motion.div
        ref={surfaceRef}
        data-state={state}
        data-live={state === "live" ? "true" : "false"}
        data-theme-skin={theme}
        data-page={pageKey}
        data-light={lightPanel ? "true" : "false"}
        className={`notch-island ${device === "desktop" ? "is-desktop" : "is-mobile"}${dragging ? " is-dragging" : ""}`}
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
        <span className="notch-island__gloss" aria-hidden="true" />

        {state === "live" &&
          transport &&
          (onSongSurface || transport.hasControls === false ? (
            <NotchLivePill t={transport} onVibrate={vibrate} compact nameOnly />
          ) : (
            <NotchLivePill t={transport} onVibrate={vibrate} />
          ))}

        {state === "orb" && (
          <span className="notch-orb" aria-hidden="true">
            <OrbIcon size={18} strokeWidth={2.2} />
          </span>
        )}

        <AnimatePresence>
          {state === "open" && (
            <motion.div
              key="panel"
              className="notch-panel"
              role="menu"
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              transition={panelTransition}
            >
              <Suspense fallback={<div className="notch-panel__loading" />}>
                <SwitcherPanel
                  modes={MODES}
                  destinations={DESTINATIONS}
                  theme={theme}
                  reduceMotion={!!reduceMotion}
                  isMobile={!isDesktop}
                  branch={branch}
                  onBranch={selectBranch}
                  onMode={(id: Theme) => {
                    setTheme(id);
                    close();
                    vibrate();
                  }}
                />
              </Suspense>
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
