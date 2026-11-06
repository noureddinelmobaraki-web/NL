import React from 'react';
import { Pause, Play, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { ASSETS } from '../../../constants/assets';
import {
  formatDuration,
  RotatingEarthButton,
  RotatingSunButton,
  WireframeSphereOrbButton,
} from './orbs/OrbTriggers';
import { LIQUID_GLASS_HLS_VIDEOS, useOrbsHlsVideo } from './orbs/useOrbsHlsVideo';
import type { LiquidGlassMode } from './orbs/useQuadLensWebGL';

export { LIQUID_GLASS_HLS_VIDEOS };

export const LIQUID_GLASS_TITLE_IMAGES = {
  earthX: ASSETS.profile.xOrb,
  sunAlbums: ASSETS.profile.albumsOrb,
  booksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/books-removebg-preview.webp',
  audiobooksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/audio.books-removebg-preview.webp',
  naturalWidth: 2400,
  naturalHeight: 1340,
} as const;

export interface OrbsStageProps {
  mode: LiquidGlassMode;
  isStackedLayout: boolean;
  webglReady: boolean;
  effectiveMuted: boolean;
  currentVideoIndex: number | null;
  glassBoxRef: React.RefObject<HTMLDivElement | null>;
  sunGlassBoxRef: React.RefObject<HTMLDivElement | null>;
  booksGlassBoxRef: React.RefObject<HTMLDivElement | null>;
  audiobooksGlassBoxRef: React.RefObject<HTMLDivElement | null>;
  onTriggerRandomVideo: () => void;
  onOpenSunWindow: () => void;
  onOpenBooksWindow: () => void;
  onOpenAudiobooksWindow: () => void;
  onReturnToOrbs: () => void;
  onToggleMute: () => void;
  onVideoAspectChange: (aspect: number) => void;
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  onVideoElementMount?: (mediaEl: HTMLMediaElement | null) => void;
}

export const OrbsStage: React.FC<OrbsStageProps> = ({
  mode,
  isStackedLayout,
  webglReady,
  effectiveMuted,
  currentVideoIndex,
  glassBoxRef,
  sunGlassBoxRef,
  booksGlassBoxRef,
  audiobooksGlassBoxRef,
  onTriggerRandomVideo,
  onOpenSunWindow,
  onOpenBooksWindow,
  onOpenAudiobooksWindow,
  onReturnToOrbs,
  onToggleMute,
  onVideoAspectChange,
  onVideoAudioActiveChange,
  onVideoElementMount,
}) => {
  const {
    videoRef,
    seekTrackRef,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlayPause,
    handleSeekPointerDown,
    handleSeekPointerMove,
    handleSeekPointerUp,
  } = useOrbsHlsVideo({
    mode,
    effectiveMuted,
    currentVideoIndex,
    onTriggerRandomVideo,
    onVideoAspectChange,
    onVideoAudioActiveChange,
    onVideoElementMount,
  });

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  return (
    <>
      <main
        className={`lg-stage ${
          mode === 'orbs'
            ? isStackedLayout
              ? 'lg-stage--orbs-grid'
              : 'lg-stage--orbs-row'
            : 'lg-stage--expanded'
        }`}
        onClick={(e) => {
          if (mode === 'video') {
            const target = e.target as HTMLElement;
            if (
              target.closest('.lg-main-glass--video') ||
              target.closest('.lg-progress-bar') ||
              target.closest('.lg-bottom-dock') ||
              target.closest('button')
            ) {
              return;
            }
            onReturnToOrbs();
          }
        }}
      >
        {/* 1. BOOKS CELESTIAL COLUMN */}
        <div
          className={`lg-celestial-unit lg-celestial-unit--books${
            mode === 'video' ? ' lg-celestial-unit--hidden' : ''
          }`}
        >
          <div
            ref={booksGlassBoxRef}
            className={`lg-main-glass lg-main-glass--books${
              !webglReady ? ' lg-main-glass--css-fallback' : ''
            }`}
          >
            <div className="lg-main-glass__caustic lg-main-glass__caustic--books" aria-hidden="true" />
            <div className="lg-main-glass__rim lg-main-glass__rim--books" aria-hidden="true" />
            <div className="lg-main-glass__sheen" aria-hidden="true" />
            <WireframeSphereOrbButton
              variant="books"
              onActivate={onOpenBooksWindow}
              ariaLabel="اضغط لفتح مكتبة الكتب العالمية Books"
            />
          </div>

          {mode === 'orbs' &&
            (LIQUID_GLASS_TITLE_IMAGES.booksImage ? (
              <img
                src={LIQUID_GLASS_TITLE_IMAGES.booksImage}
                alt="Books"
                width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                onClick={onOpenBooksWindow}
                className="lg-orb-title-img lg-orb-title-img--books"
                decoding="async"
                draggable={false}
              />
            ) : (
              <button
                type="button"
                onClick={onOpenBooksWindow}
                className="lg-orb-title-text lg-orb-title-text--books"
                aria-label="Books"
              >
                Books
              </button>
            ))}
        </div>

        {/* 2. EARTH CELESTIAL COLUMN */}
        <div
          className={`lg-celestial-unit lg-celestial-unit--earth${
            mode === 'video' ? ' lg-celestial-unit--expanded' : ''
          }`}
        >
          <div
            ref={glassBoxRef}
            className={`lg-main-glass ${
              mode === 'video' ? 'lg-main-glass--video' : 'lg-main-glass--earth'
            }${!webglReady ? ' lg-main-glass--css-fallback' : ''}`}
          >
            <div className="lg-main-glass__caustic" aria-hidden="true" />
            <div className="lg-main-glass__rim" aria-hidden="true" />
            <div className="lg-main-glass__sheen" aria-hidden="true" />

            <RotatingEarthButton onActivate={onTriggerRandomVideo} hidden={mode === 'video'} />

            {mode === 'video' && (
              <div className="lg-video-viewport" onClick={togglePlayPause}>
                <video
                  ref={videoRef}
                  className="lg-video-el"
                  width={1280}
                  height={720}
                  playsInline
                  preload="none"
                />
                {isBuffering && (
                  <div className="lg-video-spinner-wrap" aria-hidden="true">
                    <div className="lg-video-spinner" />
                  </div>
                )}
                {!isPlaying && !isBuffering && (
                  <div className="lg-video-paused-badge" aria-hidden="true">
                    <Play size={26} fill="currentColor" />
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === 'orbs' && (
            <img
              src={LIQUID_GLASS_TITLE_IMAGES.earthX}
              alt="X"
              width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
              height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
              onClick={onTriggerRandomVideo}
              className="lg-orb-title-img lg-orb-title-img--earth"
              decoding="async"
              draggable={false}
            />
          )}
        </div>

        {/* 3. SUN CELESTIAL COLUMN */}
        <div
          className={`lg-celestial-unit lg-celestial-unit--sun${
            mode === 'video' ? ' lg-celestial-unit--hidden' : ''
          }`}
        >
          <div
            ref={sunGlassBoxRef}
            className={`lg-main-glass lg-main-glass--sun${
              !webglReady ? ' lg-main-glass--css-fallback' : ''
            }`}
          >
            <div className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
            <div className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
            <div className="lg-main-glass__sheen" aria-hidden="true" />
            <RotatingSunButton onActivate={onOpenSunWindow} hidden={false} />
          </div>

          {mode === 'orbs' && (
            <img
              src={LIQUID_GLASS_TITLE_IMAGES.sunAlbums}
              alt="ALBUMS"
              width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
              height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
              onClick={onOpenSunWindow}
              className="lg-orb-title-img lg-orb-title-img--sun"
              decoding="async"
              draggable={false}
            />
          )}
        </div>

        {/* 4. AUDIO BOOKS CELESTIAL COLUMN */}
        <div
          className={`lg-celestial-unit lg-celestial-unit--audiobooks${
            mode === 'video' ? ' lg-celestial-unit--hidden' : ''
          }`}
        >
          <div
            ref={audiobooksGlassBoxRef}
            className={`lg-main-glass lg-main-glass--audiobooks${
              !webglReady ? ' lg-main-glass--css-fallback' : ''
            }`}
          >
            <div
              className="lg-main-glass__caustic lg-main-glass__caustic--audiobooks"
              aria-hidden="true"
            />
            <div className="lg-main-glass__rim lg-main-glass__rim--audiobooks" aria-hidden="true" />
            <div className="lg-main-glass__sheen" aria-hidden="true" />
            <WireframeSphereOrbButton
              variant="audiobooks"
              onActivate={onOpenAudiobooksWindow}
              ariaLabel="اضغط لفتح مكتبة الكتب الصوتية audio books"
            />
          </div>

          {mode === 'orbs' &&
            (LIQUID_GLASS_TITLE_IMAGES.audiobooksImage ? (
              <img
                src={LIQUID_GLASS_TITLE_IMAGES.audiobooksImage}
                alt="audio books"
                width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                onClick={onOpenAudiobooksWindow}
                className="lg-orb-title-img lg-orb-title-img--audiobooks"
                decoding="async"
                draggable={false}
              />
            ) : (
              <button
                type="button"
                onClick={onOpenAudiobooksWindow}
                className="lg-orb-title-text lg-orb-title-text--audiobooks"
                aria-label="audio books"
              >
                audio books
              </button>
            ))}
        </div>

        {/* 5. Capillary Progress Bar */}
        {mode === 'video' && (
          <div
            className="lg-glass-pill lg-progress-bar"
            role="region"
            aria-label="شريط تقدم الفيديو"
          >
            <button
              type="button"
              className="lg-icon-tap"
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
            </button>

            <div
              ref={seekTrackRef}
              className="lg-seek-hit"
              role="slider"
              tabIndex={0}
              aria-label="تقديم أو ترجيع الفيديو"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration || 0)}
              aria-valuenow={Math.round(currentTime || 0)}
              onPointerDown={handleSeekPointerDown}
              onPointerMove={handleSeekPointerMove}
              onPointerUp={handleSeekPointerUp}
              onPointerCancel={handleSeekPointerUp}
            >
              <div className="lg-seek-track">
                <div className="lg-seek-fill" style={{ width: `${progressPercent}%` }}>
                  <span className="lg-seek-fill__wave" aria-hidden="true" />
                </div>
                <div className="lg-seek-thumb" style={{ left: `${progressPercent}%` }} />
                <div className="lg-seek-tube-gloss" aria-hidden="true" />
              </div>
            </div>

            <span className="lg-time-readout">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            <button
              type="button"
              className="lg-icon-tap"
              onClick={onToggleMute}
              aria-label={effectiveMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
            >
              {effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        )}
      </main>

      {mode === 'video' && (
        <div className="lg-bottom-dock">
          <button
            type="button"
            className="lg-next-random-btn"
            onClick={onTriggerRandomVideo}
            aria-label="عرض فيديو عشوائي آخر"
          >
            <span className="lg-next-random-btn__sheen" aria-hidden="true" />
            <span className="lg-next-random-btn__caustic" aria-hidden="true" />
            <Shuffle size={20} strokeWidth={2.3} className="lg-next-random-btn__icon" />
          </button>
        </div>
      )}
    </>
  );
};
