/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import {
  Component,
  useRef,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { m, useReducedMotion } from "framer-motion";
import { VolumeX, Square } from "lucide-react";
import { useAuthOptional } from "../../context/AuthContext";
import { audioManager } from "../../audio/audioManager";
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
import { useNotchNavigationActions } from "./hooks/useNotchNavigationActions";
import { useFullscreenAutoHide } from "./hooks/useFullscreenAutoHide";
import { useSongSurface } from "../../audio/songSurfaceBus";
import { NotchLivePill } from "./NotchLivePill";
import {
  DesktopNotchPanel,
  MobileControlCenterOverlay,
} from "./NotchExpandedControls";

const ORB_LENS_DISPLACEMENT_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<defs>' +
      '<radialGradient id="g" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#808000"/>' +
      '<stop offset="70%" stop-color="#808000"/>' +
      '<stop offset="92%" stop-color="#b84800"/>' +
      '<stop offset="100%" stop-color="#48b800"/>' +
      "</radialGradient>" +
      "</defs>" +
      '<rect width="64" height="64" fill="url(#g)"/>' +
      "</svg>",
  );

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
  const auth = useAuthOptional();
  const reduceMotion = useReducedMotion();
  const { device, isDesktop, isTouch } = useDeviceLayout();
  const isMobile = !isDesktop;
  const transport = useNowPlayingNotch();
  const onSongSurface = useSongSurface();
  const isFullscreenHidden = useFullscreenAutoHide();

  const { open, branch, toggle, close, openPanel, selectBranch } =
    useSwitcherState();

  const {
    theme,
    returnToWelcome,
    pageKey,
    pageMeta,
    destinations,
    vibrate,
    handleModeSelect,
  } = useNotchNavigationActions({ close, isTouch });

  const { lightPanel } = useThemeSkin(theme);

  const muted = useSyncExternalStore(
    (cb) => audioManager.subscribeMuted(cb),
    () => audioManager.isMuted(),
    () => false,
  );

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

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

  useOutsideClose({ enabled: open, rootRef: anchorRef, onClose: close });
  useBackdropDim(open, {
    opacity: isMobile ? 0.86 : 0.42,
    ms: reduceMotion ? 0 : 220,
    color: isMobile ? "#020306" : "#070b0f",
  });

  useEffect(() => {
    if (open) schedule();
    else keepAlive();
  }, [open, schedule, keepAlive]);

  useEffect(() => {
    if (isFullscreenHidden && open) {
      close();
    }
  }, [isFullscreenHidden, open, close]);

  const hasSong = !!transport;
  const isAudioActive = Boolean(transport?.isPlaying);
  const mode = useNotchMode({ hasSong });
  const state: "orb" | "live" | "open" = open
    ? "open"
    : mode === "live"
      ? "live"
      : "orb";

  const OrbIcon = pageMeta.icon;
  const accent = transport?.accent ?? pageMeta.accent;

  const hasSvgBackdrop = useMemo(() => {
    if (!isDesktop || typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> };
    };
    return Boolean(nav.userAgentData?.brands?.some((b) => /Chromium/.test(b.brand)));
  }, [isDesktop]);

  const conflict = useAudioConflict();

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

  const collapsedMobileState: "orb" | "live" =
    mode === "live" ? "live" : "orb";
  const islandState: "orb" | "live" | "open" = isMobile
    ? collapsedMobileState
    : state;

  const styleVars = {
    ["--notch-accent" as string]: accent,
    transform: `translate3d(${offset.x}px, ${isMobile ? 0 : offset.y}px, 0)`,
  } as React.CSSProperties;

  const anchorStyle = {
    ["--notch-accent" as string]: accent,
    ...(isFullscreenHidden
      ? {
          opacity: 0,
          pointerEvents: "none" as const,
          visibility: "hidden" as const,
          transform: "translateX(-50%) scale(0.6)",
        }
      : undefined),
  } as React.CSSProperties;

  const surfaceTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 410, damping: 26, mass: 0.82 };

  const handleProfileClick = () => {
    if (auth?.user) auth.openProfile();
    else auth?.openAuthModal?.();
    close();
    vibrate();
  };

  const handleExitClick = () => {
    close();
    returnToWelcome();
    vibrate();
  };

  return createPortal(
    <div
      ref={anchorRef}
      className={`notch-portal-root${hasSvgBackdrop ? " has-svg-backdrop" : ""}`}
      data-device={device}
      data-page={pageKey}
    >
      {hasSvgBackdrop && (
        <svg
          width="0"
          height="0"
          style={{ position: "absolute" }}
          aria-hidden="true"
        >
          <filter
            id="notch-orb-lens"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={ORB_LENS_DISPLACEMENT_URI}
              result="lensMap"
              preserveAspectRatio="none"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="lensMap"
              scale={10}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}

      <div
        className="notch-anchor"
        data-device={device}
        data-page={pageKey}
        data-fullscreen-hidden={isFullscreenHidden ? "true" : "false"}
        style={anchorStyle}
      >
        <m.div
          ref={surfaceRef}
          data-state={islandState}
          data-cc-open={isMobile && state === "open" ? "true" : "false"}
          data-live={islandState === "live" ? "true" : "false"}
          data-audio-active={isAudioActive ? "true" : "false"}
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
          <span className="notch-island__gloss" aria-hidden="true" />

          {islandState === "live" &&
            transport &&
            (onSongSurface || transport.hasControls === false ? (
              <NotchLivePill t={transport} onVibrate={vibrate} compact nameOnly />
            ) : (
              <NotchLivePill t={transport} onVibrate={vibrate} />
            ))}

          {islandState === "orb" && (
            <span className="orb" aria-hidden="true">
              <span className="orb__shadow" />
              <span className="orb__aura-wrap"><span className="orb__aura" /></span>
              <span className="orb__lens" />
              <span className="orb__back" />
              <span className="orb__core">
                <span className="merc__float">
                  <span className="merc__react">
                    <span className="merc__beat">
                      <span className="merc__squash">
                        <span className="merc__lobe-orbit"><span className="merc__lobe" /></span>
                        <span className="merc__spin"><span className="merc__body" /></span>
                      </span>
                    </span>
                  </span>
                  <span className="merc__shade" />
                  <span className="merc__accent" />
                </span>
              </span>
              <span className="orb__tint" />
              <span className="orb__shell" />
            </span>
          )}

          <DesktopNotchPanel
            visible={!isMobile && state === "open"}
            destinations={destinations}
            theme={theme}
            reduceMotion={!!reduceMotion}
            branch={branch}
            onBranch={selectBranch}
            onMode={handleModeSelect}
            transport={transport}
            vibrate={vibrate}
            muted={muted}
            onProfileClick={handleProfileClick}
            onExit={() => {
              returnToWelcome();
              vibrate();
            }}
          />
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

      <MobileControlCenterOverlay
        visible={isMobile && state === "open"}
        theme={theme}
        lightPanel={lightPanel}
        accent={accent}
        reduceMotion={!!reduceMotion}
        pageKey={pageKey}
        OrbIcon={OrbIcon}
        transport={transport}
        destinations={destinations}
        branch={branch}
        onBranch={selectBranch}
        onMode={handleModeSelect}
        muted={muted}
        close={close}
        schedule={schedule}
        vibrate={vibrate}
        onProfileClick={handleProfileClick}
        onExit={handleExitClick}
      />
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
