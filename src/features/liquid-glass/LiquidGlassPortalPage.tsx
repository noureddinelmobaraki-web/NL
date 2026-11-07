/**
 * src/features/liquid-glass/LiquidGlassPortalPage.tsx
 *
 * Modular Liquid Glass Portal Wrapper:
 *  - Coordinates real-time Quad-Lens WebGL refraction canvas (`useQuadLensWebGL`)
 *  - Switches cleanly between Orbs/Video, Sun Albums, Books, and Audiobooks stages
 *  - Integrates hardware Back button (`useBackToClose`) on mobile so Back returns to Orbs
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useBackToClose } from '../../hooks/useBackToClose';
import { useLiquidGlassAudio } from './useLiquidGlassAudio';
import { EARTH_TEXTURE_DATA_URI, SUN_TEXTURE_DATA_URI } from './sunTexture';
import { SunAlbumsStage } from './stages/SunAlbumsStage/SunAlbumsStage';
import { BooksStage } from './stages/books/BooksStage';
import { AudiobooksStage } from './stages/audiobooks/AudiobooksStage';
import {
  LIQUID_GLASS_HLS_VIDEOS,
  LIQUID_GLASS_TITLE_IMAGES,
  OrbsStage,
} from './stages/orbs/OrbsStage';
import { GLASS_CONFIG } from './stages/orbs/portalShaders';
import {
  LIQUID_GLASS_BACKGROUNDS,
  type LiquidGlassMode,
  useQuadLensWebGL,
} from './stages/orbs/useQuadLensWebGL';
import type { AudiobookItem, BookItem } from './booksAudioService';
import './stages/orbs/portal.css';

export {
  LIQUID_GLASS_BACKGROUNDS,
  LIQUID_GLASS_TITLE_IMAGES,
  LIQUID_GLASS_HLS_VIDEOS,
  type LiquidGlassMode,
};

export const SUN_SCALE_MULTIPLIER = 1.15;

export interface LiquidGlassPortalPageProps {
  onClose?: () => void;
  initialMode?: LiquidGlassMode;
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  onVideoElementMount?: (mediaEl: HTMLMediaElement | null) => void;
  externalMuted?: boolean;
  onToggleMute?: () => void;
}

export default function LiquidGlassPortalPage({
  onClose,
  initialMode = 'orbs',
  onVideoAudioActiveChange: onVideoAudioActiveChangeProp,
  onVideoElementMount: onVideoElementMountProp,
  externalMuted: externalMutedProp,
  onToggleMute: onToggleMuteProp,
}: LiquidGlassPortalPageProps) {
  const scopeId = useId();
  const managedAudio = useLiquidGlassAudio();

  const onVideoAudioActiveChange =
    onVideoAudioActiveChangeProp ?? managedAudio.onVideoAudioActiveChange;
  const onVideoElementMount =
    onVideoElementMountProp ?? managedAudio.onVideoElementMount;
  const externalMuted = externalMutedProp ?? managedAudio.externalMuted;
  const onToggleMute = onToggleMuteProp ?? managedAudio.onToggleMute;

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile:
      typeof window !== 'undefined'
        ? window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery).matches
        : false,
  }));

  const isMobileView = viewport.isMobile;
  const isStackedLayout =
    viewport.width < 1140 || viewport.height > viewport.width * 0.95;

  const orbScale = useMemo(() => {
    const w = Math.max(viewport.width, 320);
    const h = Math.max(viewport.height, 480);
    if (isStackedLayout) {
      const maxByWidth = (w - 48) / 680;
      const maxByHeight = (h - 140) / 820;
      return Math.min(Math.max(Math.min(maxByWidth, maxByHeight), 0.38), 0.82);
    }
    const maxByWidth = (w - 140) / 1380;
    const maxByHeight = (h - 170) / 470;
    return Math.min(Math.max(Math.min(maxByWidth, maxByHeight), 0.52), 0.96);
  }, [viewport.width, viewport.height, isStackedLayout]);

  const persistStageMode = useCallback((next: LiquidGlassMode | null) => {
    try {
      if (next && next !== 'orbs') window.sessionStorage.setItem('nl_lg_initial_mode', next);
      else window.sessionStorage.removeItem('nl_lg_initial_mode');
    } catch {
      /* ignore */
    }
  }, []);

  const [mode, setMode] = useState<LiquidGlassMode>(() => {
    if (initialMode && initialMode !== 'orbs') return initialMode;
    try {
      const s = typeof window !== 'undefined' ? window.sessionStorage.getItem('nl_lg_initial_mode') : null;
      if (s === 'books' || s === 'audiobooks' || s === 'sun' || s === 'video' || s === 'orbs') return s;
    } catch {
      /* ignore */
    }
    return initialMode || 'orbs';
  });
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);
  const [localMuted, setLocalMuted] = useState(false);

  const effectiveMuted = externalMuted || localMuted;

  const glassBoxRef = useRef<HTMLDivElement | null>(null);
  const sunGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const booksGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const audiobooksGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const shuffleBagRef = useRef<number[]>([]);
  const lastPickedRef = useRef<number>(-1);

  const { canvasRef, webglReady, handlePointerMove, handlePointerLeave } = useQuadLensWebGL({
    glassBoxRef,
    sunGlassBoxRef,
    booksGlassBoxRef,
    audiobooksGlassBoxRef,
    mode,
    isMobileView,
  });

  const pickNextRandomVideoIndex = useCallback((): number => {
    const total = LIQUID_GLASS_HLS_VIDEOS.length;
    if (total <= 1) return 0;

    if (shuffleBagRef.current.length === 0) {
      const fresh = Array.from({ length: total }, (_, i) => i);
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }
      if (fresh[fresh.length - 1] === lastPickedRef.current && fresh.length > 1) {
        [fresh[0], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[0]];
      }
      shuffleBagRef.current = fresh;
    }

    const nextIdx = shuffleBagRef.current.pop() ?? 0;
    lastPickedRef.current = nextIdx;
    return nextIdx;
  }, []);

  const triggerRandomVideo = useCallback(() => {
    const nextIdx = pickNextRandomVideoIndex();
    persistStageMode('video');
    setMode('video');
    setCurrentVideoIndex(nextIdx);
    onVideoAudioActiveChange?.(true);
  }, [pickNextRandomVideoIndex, onVideoAudioActiveChange, persistStageMode]);

  const [crossBookQuery, setCrossBookQuery] = useState<string>('');
  const [crossSelectedBook, setCrossSelectedBook] = useState<BookItem | null>(null);
  const [crossAudiobookQuery, setCrossAudiobookQuery] = useState<string>('');
  const [crossSelectedAudiobook, setCrossSelectedAudiobook] = useState<AudiobookItem | null>(null);

  const initialVideoTriggeredRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'video' && !initialVideoTriggeredRef.current) {
      initialVideoTriggeredRef.current = true;
      triggerRandomVideo();
    } else if (initialMode && initialMode !== 'orbs') {
      setMode(initialMode);
    }
  }, [initialMode, triggerRandomVideo]);

  const onOpenSunWindow = useCallback(() => {
    persistStageMode('sun');
    setMode('sun');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange, persistStageMode]);

  const onOpenBooksWindow = useCallback(() => {
    persistStageMode('books');
    setCrossBookQuery('');
    setCrossSelectedBook(null);
    setMode('books');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange, persistStageMode]);

  const onOpenAudiobooksWindow = useCallback(() => {
    persistStageMode('audiobooks');
    setCrossAudiobookQuery('');
    setCrossSelectedAudiobook(null);
    setMode('audiobooks');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange, persistStageMode]);

  const handleSwitchBookToAudiobook = useCallback(
    (query: string, matchedAudiobook?: AudiobookItem) => {
      persistStageMode('audiobooks');
      setCrossAudiobookQuery(query);
      setCrossSelectedAudiobook(matchedAudiobook || null);
      setMode('audiobooks');
      onVideoAudioActiveChange?.(false);
    },
    [onVideoAudioActiveChange, persistStageMode],
  );

  const handleSwitchAudiobookToBook = useCallback(
    (query: string, matchedBook?: BookItem) => {
      persistStageMode('books');
      setCrossBookQuery(query);
      setCrossSelectedBook(matchedBook || null);
      setMode('books');
      onVideoAudioActiveChange?.(false);
    },
    [onVideoAudioActiveChange, persistStageMode],
  );

  const handleReturnToOrbs = useCallback(() => {
    persistStageMode(null);
    setMode('orbs');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange, persistStageMode]);

  useBackToClose(mode !== 'orbs', handleReturnToOrbs);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery);

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: mq.matches,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', updateViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode !== 'orbs') {
          handleReturnToOrbs();
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, handleReturnToOrbs, onClose]);

  useEffect(() => {
    return () => {
      onVideoAudioActiveChange?.(false);
    };
  }, [onVideoAudioActiveChange]);

  const handleToggleMuteClick = useCallback(() => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setLocalMuted((m) => !m);
    }
  }, [onToggleMute]);

  const cornerRadiusPx = isMobileView
    ? GLASS_CONFIG.cornerRadiusMobile
    : GLASS_CONFIG.cornerRadiusDesktop;

  const earthBubblePx = Math.round(286 * orbScale);
  const sunBubblePx = Math.round(286 * orbScale * SUN_SCALE_MULTIPLIER);

  return (
    <div
      data-lg-scope={scopeId}
      className="lg-portal-root"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--lg-video-aspect': String(videoAspect),
          '--lg-corner': `${cornerRadiusPx}px`,
          '--lg-orb-scale': String(orbScale),
          '--lg-earth-bubble': `${earthBubblePx}px`,
          '--lg-sun-bubble': `${sunBubblePx}px`,
          '--lg-earth-tex-url': `url("${EARTH_TEXTURE_DATA_URI}")`,
          '--lg-sun-tex-url': `url("${SUN_TEXTURE_DATA_URI}")`,
        } as React.CSSProperties
      }
    >
      <picture className="lg-bg-picture" aria-hidden="true">
        <source
          media={LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery}
          srcSet={LIQUID_GLASS_BACKGROUNDS.phone}
        />
        <img
          src={LIQUID_GLASS_BACKGROUNDS.pc}
          alt=""
          className="lg-bg-img"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </picture>

      <canvas
        ref={canvasRef}
        className={`lg-webgl-canvas${
          webglReady && (mode === 'orbs' || mode === 'video') ? ' lg-webgl-canvas--ready' : ''
        }`}
        aria-hidden="true"
      />

      <div
        className={`lg-portal-stage-dimmer${
          mode === 'books' || mode === 'audiobooks' || mode === 'sun'
            ? ' lg-portal-stage-dimmer--active'
            : ''
        }`}
        aria-hidden="true"
      />

      {mode === 'video' && (
        <button
          type="button"
          className="lg-glass-pill lg-back-orbs-btn"
          onClick={handleReturnToOrbs}
          aria-label="العودة إلى كوكب الأرض والشمس"
        >
          <ArrowLeft size={18} strokeWidth={2.3} />
        </button>
      )}

      {onClose && (
        <button
          type="button"
          className="lg-glass-pill lg-close-btn"
          onClick={() => {
            if (mode !== 'orbs') {
              handleReturnToOrbs();
            } else {
              try {
                window.sessionStorage.removeItem('nl_lg_initial_mode');
              } catch {
                /* ignore */
              }
              onClose();
            }
          }}
          aria-label={mode !== 'orbs' ? 'Return to Orbs' : 'Close Page'}
        >
          <X size={18} strokeWidth={2.3} />
        </button>
      )}

      {mode === 'sun' ? (
        <SunAlbumsStage
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
          externalMuted={effectiveMuted}
          onToggleMute={handleToggleMuteClick}
          onAudioActiveChange={onVideoAudioActiveChange}
          onAudioElementMount={onVideoElementMount}
          onBackToOrbs={handleReturnToOrbs}
        />
      ) : mode === 'books' ? (
        <BooksStage
          onBackToOrbs={handleReturnToOrbs}
          initialSearchQuery={crossBookQuery}
          initialSelectedBook={crossSelectedBook}
          onSwitchToAudiobook={handleSwitchBookToAudiobook}
        />
      ) : mode === 'audiobooks' ? (
        <AudiobooksStage
          externalMuted={effectiveMuted}
          onToggleMute={handleToggleMuteClick}
          onAudioActiveChange={onVideoAudioActiveChange}
          onAudioElementMount={onVideoElementMount}
          onBackToOrbs={handleReturnToOrbs}
          initialSearchQuery={crossAudiobookQuery}
          initialSelectedAudiobook={crossSelectedAudiobook}
          onSwitchToBook={handleSwitchAudiobookToBook}
        />
      ) : (
        <OrbsStage
          mode={mode}
          isStackedLayout={isStackedLayout}
          webglReady={webglReady}
          effectiveMuted={effectiveMuted}
          currentVideoIndex={currentVideoIndex}
          glassBoxRef={glassBoxRef}
          sunGlassBoxRef={sunGlassBoxRef}
          booksGlassBoxRef={booksGlassBoxRef}
          audiobooksGlassBoxRef={audiobooksGlassBoxRef}
          onTriggerRandomVideo={triggerRandomVideo}
          onOpenSunWindow={onOpenSunWindow}
          onOpenBooksWindow={onOpenBooksWindow}
          onOpenAudiobooksWindow={onOpenAudiobooksWindow}
          onReturnToOrbs={handleReturnToOrbs}
          onToggleMute={handleToggleMuteClick}
          onVideoAspectChange={setVideoAspect}
          onVideoAudioActiveChange={onVideoAudioActiveChange}
          onVideoElementMount={onVideoElementMount}
        />
      )}
    </div>
  );
}
