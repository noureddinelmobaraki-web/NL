/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * AeroImageViewer — the ONE unified, professional fullscreen image reader for
 * BOTH albums (ME bit + Lens). It replaces the old MeBitGallery / LensGallery
 * fullscreen views.
 *
 * Features:
 *   - true fullscreen: adds body.nlav-open so the page chrome (scroll-to-top
 *     arrow, floating buttons, mobile nav) is fully hidden — no stray arrows.
 *   - pro zoom: wheel + pinch + double-click/tap zoom-to-point, clamped pan.
 *   - glass zoom rail (AeroZoomBar): desktop shows 3s then hides + reveals on
 *     cursor proximity; mobile appears on pinch, hides ~2s after.
 *   - light Aero glass frame, exit button, and a WORKING mute button that drives
 *     the album soundtrack through audioManager (pause/play the real source).
 *   - keyboard: Esc closes, arrows navigate (and are prevented from leaking to
 *     the app-wide song shortcuts while the viewer is open).
 *
 * It renders on top of AeroGalleryHub and shares the album soundtrack, so
 * opening/closing the viewer never restarts or double-plays audio.
 */

import type React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { audioManager } from "../../../audio/audioManager";
import { useDeviceType } from "../../../hooks/useDeviceType";
import { ALBUMS, type AlbumId } from "./albums";
import { useImageZoomPan } from "./useImageZoomPan";
import { AeroZoomBar } from "./AeroZoomBar";
import "../../../styles/aero-viewer.css";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const slideVariants = {
  enter: { opacity: 0, scale: 1.03 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.985 },
};

const slideTransition = { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] };

export interface AeroImageViewerProps {
  open: boolean;
  album: AlbumId;
  images: readonly string[];
  startIndex: number;
  onClose: () => void;
}

export function AeroImageViewer(props: AeroImageViewerProps) {
  const { open, album, images, startIndex, onClose } = props;
  const { isMobile, isTablet } = useDeviceType();
  const compact = isMobile || isTablet;
  const orientation = compact ? "horizontal" : "vertical";
  const accent = ALBUMS[album].accent;
  const audioSource = ALBUMS[album].audioSource;

  const [index, setIndex] = useState(startIndex);
  const [soundOn, setSoundOn] = useState(true);
  const [barVisible, setBarVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = images.length;

  const revealBar = useCallback((ms: number) => {
    setBarVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarVisible(false), ms);
  }, []);

  // goRef lets the gesture callbacks call the latest navigate fn without a
  // use-before-declaration cycle (go depends on the zoom object).
  const goRef = useRef<(dir: number) => void>(() => {});

  const zoom = useImageZoomPan({
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    onSwipeNext: () => goRef.current(1),
    onSwipePrev: () => goRef.current(-1),
    onSwipeClose: () => onClose(),
    onZoomActivity: () => revealBar(compact ? 2000 : 2600),
  });
  const { reset } = zoom;

  const go = useCallback(
    (dir: number) => {
      if (total < 1) return;
      reset();
      setIndex((i) => (i + dir + total) % total);
    },
    [total, reset],
  );
  goRef.current = go;

  // Sync index + reset zoom whenever the viewer (re)opens at a new image.
  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, startIndex), Math.max(0, total - 1)));
    reset();
  }, [open, startIndex, total, reset]);

  // Reflect current soundtrack state + reveal the desktop rail on open.
  useEffect(() => {
    if (!open) return;
    setSoundOn(audioManager.isSourceActive(audioSource));
    if (!compact) revealBar(3000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [open, audioSource, compact, revealBar]);

  // True fullscreen: hide all page chrome while the viewer is open.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("nlav-open");
    return () => document.body.classList.remove("nlav-open");
  }, [open]);

  // Keyboard: capture so app-wide Space/Arrow song shortcuts do not fire.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(-1);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, onClose, go]);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      if (next) void audioManager.play(audioSource);
      else audioManager.pause(audioSource);
      return next;
    });
  }, [audioSource]);

  // Desktop: reveal the rail when the cursor approaches its edge.
  const onOverlayPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (compact || e.pointerType !== "mouse") return;
      if (e.clientX > window.innerWidth - 150) revealBar(1800);
    },
    [compact, revealBar],
  );

  if (!open || total < 1) return null;

  const safeIndex = Math.min(index, total - 1);
  const zoomWrapStyle: React.CSSProperties = {
    transform:
      "translate3d(" + zoom.offsetX + "px, " + zoom.offsetY + "px, 0) scale(" + zoom.scale + ")",
    cursor: zoom.isZoomed ? "grab" : "zoom-in",
  };
  const frameStyle: React.CSSProperties = { boxShadow: "0 0 0 1px " + accent + "55, 0 24px 70px rgba(6,26,54,.55)" };

  return (
    <div
      className="nlav-overlay"
      data-album={album}
      role="dialog"
      aria-modal="true"
      aria-label={ALBUMS[album].label + " viewer"}
      onPointerMove={onOverlayPointerMove}
    >
      <div className="nlav-veil" />

      <button type="button" className="nlav-btn nlav-close" onClick={onClose} aria-label="Close viewer">
        <X size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="nlav-btn nlav-mute"
        onClick={toggleSound}
        aria-label={soundOn ? "Mute music" : "Play music"}
        aria-pressed={!soundOn}
      >
        {soundOn ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
      </button>

      <div className="nlav-counter" aria-live="polite">
        {safeIndex + 1} / {total}
      </div>

      <div
        className="nlav-stage"
        ref={zoom.containerRef}
        onPointerDown={zoom.handlers.onPointerDown}
        onPointerMove={zoom.handlers.onPointerMove}
        onPointerUp={zoom.handlers.onPointerUp}
        onPointerCancel={zoom.handlers.onPointerCancel}
        onDoubleClick={zoom.handlers.onDoubleClick}
      >
        <div className="nlav-frame" style={frameStyle}>
          <AnimatePresence initial={false}>
            <motion.div
              key={safeIndex}
              className="nlav-slide"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              <div className="nlav-zoomwrap" style={zoomWrapStyle}>
                <img
                  className="nlav-img"
                  src={images[safeIndex]}
                  alt={ALBUMS[album].label + " photo " + (safeIndex + 1)}
                  draggable={false}
                  decoding="async"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="nlav-btn nlav-nav nlav-prev"
            onClick={() => go(-1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="nlav-btn nlav-nav nlav-next"
            onClick={() => go(1)}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      <AeroZoomBar
        min={MIN_SCALE}
        max={MAX_SCALE}
        value={zoom.scale}
        visible={barVisible}
        accent={accent}
        orientation={orientation}
        onChange={zoom.setScale}
        onActivity={() => revealBar(compact ? 2000 : 1800)}
      />
    </div>
  );
}

export default AeroImageViewer;
