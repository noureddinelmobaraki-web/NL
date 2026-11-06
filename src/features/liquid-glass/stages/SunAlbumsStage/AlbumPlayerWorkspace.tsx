/**
 * Copyright (c) 2026 NL Archive.
 * SPDX-License-Identifier: MIT
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/AlbumPlayerWorkspace.tsx
 *
 * Selected Album detail workspace: wobbling droplet cover, HLS audio streaming,
 * verified YouTube background video, track tubes, expanded player card, and synced lyrics.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useIsPhone, useIsTouch } from '../../../../hooks/useMediaQuery';
import { isLowEndDevice, prefersReducedMotion } from '../../../../utils/perf';
import type { LiquidGlassAlbum } from '../../albumsData';
import { ExpandedTrackPlayerCard } from './ExpandedTrackPlayerCard';
import { formatTrackTime } from './fisheyeMeshMath';
import { LyricsCapsuleStage, LyricsExpressiveIcon } from './LyricsCapsuleStage';
import { useAlbumAudioPlayer } from './useAlbumAudioPlayer';

export interface AlbumPlayerWorkspaceProps {
  album: LiquidGlassAlbum;
  viewportWidth: number;
  viewportHeight: number;
  externalMuted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onBack: () => void;
}

export const AlbumPlayerWorkspace: React.FC<AlbumPlayerWorkspaceProps> = ({
  album,
  viewportWidth,
  viewportHeight,
  externalMuted,
  audioRef,
  onToggleMute,
  onAudioActiveChange,
  onBack,
}) => {
  const isPhone = useIsPhone();
  const isTouch = useIsTouch();
  const lowPower = isLowEndDevice() || prefersReducedMotion() || isPhone;

  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const ascendedCoverRef = useRef<HTMLDivElement | null>(null);

  const [playerDragOffset, setPlayerDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const playerDragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const {
    activeTrack,
    setActiveTrack,
    isPlayerExpanded,
    setIsPlayerExpanded,
    isPlaying,
    isBuffering,
    currentTime,
    setCurrentTime,
    duration,
    ytBgEnabled,
    setYtBgEnabled,
    ytVideoVerifiedPlaying,
    ytVideoFailed,
    ytIframeRef,
    activeYoutubeVideoId,
    handleYtIframeLoad,
    lyricsData,
    lyricsLoading,
    lyricsWindowOpen,
    setLyricsWindowOpen,
    lyricLines,
    activeLyricIndex,
    lineKaraokeRatio,
    isScrubbingRef,
  } = useAlbumAudioPlayer({
    album,
    externalMuted,
    lowPower,
    audioRef,
    ascendedCoverRef,
    onAudioActiveChange,
  });

  const toggleAudioPlayPause = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      if (a.paused || a.ended) void a.play().catch(() => {});
      else a.pause();
    },
    [audioRef],
  );

  const handleRestartTrack = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = 0;
      setCurrentTime(0);
      if (a.paused) void a.play().catch(() => {});
    },
    [audioRef, setCurrentTime],
  );

  const handleStepTrack = useCallback(
    (dir: -1 | 1, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!activeTrack) return;
      const len = album.tracks.length;
      const idx = album.tracks.findIndex((t) => t.num === activeTrack.num);
      setActiveTrack(album.tracks[(idx + dir + len) % len]);
    },
    [album.tracks, activeTrack, setActiveTrack],
  );

  const handlePlayerCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPhone) return;
      const target = e.target as HTMLElement;
      if (target.closest('button,[role="slider"],.lg-seek-hit')) return;
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
    [isPhone, playerDragOffset.x, playerDragOffset.y],
  );

  const handlePlayerCardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = playerDragStartRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.stopPropagation();
      const maxX = viewportWidth * 0.42;
      const maxY = viewportHeight * 0.42;
      setPlayerDragOffset({
        x: Math.max(-maxX, Math.min(maxX, drag.origX + (e.clientX - drag.startX))),
        y: Math.max(-maxY, Math.min(maxY, drag.origY + (e.clientY - drag.startY))),
      });
    },
    [viewportWidth, viewportHeight],
  );

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

  const seekAudioClientX = useCallback(
    (clientX: number) => {
      const bar = seekBarRef.current;
      const a = audioRef.current;
      if (!bar || !a || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      a.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    },
    [audioRef, duration, setCurrentTime],
  );

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;
  const originParam =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

  return (
    <>
      {activeTrack && (
        <div className="lg-yt-bg-stage" aria-hidden="true">
          <div
            className={`lg-yt-bg-stage__album-fallback${
              !lowPower && ytBgEnabled && ytVideoVerifiedPlaying && !ytVideoFailed
                ? ' lg-yt-bg-stage__album-fallback--dimmed'
                : ''
            }`}
            style={{ backgroundImage: `url("${album.coverUrl}")` }}
          />
          {!lowPower && ytBgEnabled && activeYoutubeVideoId && !ytVideoFailed && (
            <div
              className={`lg-yt-bg-stage__frame-wrap${
                ytVideoVerifiedPlaying ? ' lg-yt-bg-stage__frame-wrap--playing' : ''
              }`}
            >
              <iframe
                ref={ytIframeRef}
                key={`${album.id}_${activeTrack.num}_${activeYoutubeVideoId}`}
                className="lg-yt-bg-stage__iframe"
                src={`https://www.youtube-nocookie.com/embed/${activeYoutubeVideoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${activeYoutubeVideoId}&enablejsapi=1&origin=${originParam}`}
                title=""
                allow="autoplay; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={-1}
                onLoad={handleYtIframeLoad}
              />
            </div>
          )}
          <div className="lg-yt-bg-stage__vignette" />
        </div>
      )}

      <div
        className={`lg-album-detail-workspace${
          lyricsWindowOpen && activeTrack ? ' lg-album-detail-workspace--with-lyrics' : ''
        }`}
        onClick={(e) => {
          if (isTouch) return;
          const target = e.target as HTMLElement;
          if (target.closest('.lg-album-player-column,.lg-ios26-lyrics-stage,button')) return;
          onBack();
        }}
      >
        <div className="lg-album-player-column" onClick={(e) => e.stopPropagation()}>
          <header className="lg-ascended-album-hero">
            <div
              ref={ascendedCoverRef}
              className="lg-ascended-album-cover lg-ascended-album-cover--sun-bubble"
            >
              <img
                src={album.coverUrl}
                alt={album.title}
                className="lg-ascended-album-cover__img"
                decoding="async"
                draggable={false}
              />
              <span className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
              <span className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
              <span className="lg-main-glass__sheen" aria-hidden="true" />
            </div>

            <div className="lg-ascended-album-meta">
              <h1 className="lg-ascended-album-title">{album.title}</h1>
              <p className="lg-ascended-album-artist">
                {album.artist} • {album.tracks.length} Songs
              </p>
            </div>
          </header>

          <div className="lg-track-tubes-list" role="list" aria-label={`أغاني ألبوم ${album.title}`}>
            {album.tracks.map((track, idx) => {
              const isSelectedTrack = activeTrack?.num === track.num;
              const isExpandedCard = isSelectedTrack && isPlayerExpanded;
              const trackNumFormatted = String(track.num).padStart(2, '0');
              const hasLyricsReady =
                isSelectedTrack && Boolean(lyricsData && lyricsData.lines.length > 0);

              return (
                <div
                  key={track.num}
                  role="listitem"
                  className={`lg-track-tube${isSelectedTrack ? ' lg-track-tube--current' : ''}${
                    isExpandedCard ? ' lg-track-tube--expanded-player' : ''
                  }${isExpandedCard && isDraggingPlayer ? ' lg-track-tube--dragging-player' : ''}`}
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
                    if (isExpandedCard) return;
                    if (activeTrack?.num === track.num) {
                      setIsPlayerExpanded(true);
                      const a = audioRef.current;
                      if (a) {
                        if (a.paused || a.ended) void a.play().catch(() => {});
                        else a.pause();
                      }
                    } else {
                      setActiveTrack(track);
                      setIsPlayerExpanded(true);
                      setPlayerDragOffset({ x: 0, y: 0 });
                    }
                  }}
                >
                  <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  <span className="lg-orb-capsule-sheen" aria-hidden="true" />

                  {!isExpandedCard && (
                    <div className="lg-track-tube__header">
                      {isSelectedTrack ? (
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
                        <span className="lg-track-tube__num">
                          <span className="lg-track-tube__num-glyph">{trackNumFormatted}</span>
                        </span>
                      )}

                      <div className="lg-track-tube__title-wrap">
                        {isSelectedTrack && (
                          <span className="lg-track-tube__num lg-track-tube__num--inline">
                            <span className="lg-track-tube__num-glyph">{trackNumFormatted}</span>
                          </span>
                        )}
                        <span className="lg-track-tube__title">{track.title}</span>
                      </div>

                      {isSelectedTrack && (
                        <div className="lg-track-tube__actions" onClick={(e) => e.stopPropagation()}>
                          <span className="lg-tube-time-readout">
                            {formatTrackTime(currentTime)} / {formatTrackTime(duration)}
                          </span>

                          <button
                            type="button"
                            className={`lg-tube-lyrics-btn${
                              lyricsWindowOpen ? ' lg-tube-lyrics-btn--active' : ''
                            }${hasLyricsReady ? ' lg-tube-lyrics-btn--ready' : ''}`}
                            onClick={() => setLyricsWindowOpen((open) => !open)}
                            title="عرض الكلمات المتزامنة"
                            aria-label="نافذة الكلمات المتزامنة"
                            aria-pressed={lyricsWindowOpen}
                          >
                            <LyricsExpressiveIcon />
                            {lyricsLoading && (
                              <span className="lg-tube-lyrics-dot" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isExpandedCard && (
                    <ExpandedTrackPlayerCard
                      album={album}
                      track={track}
                      isPlaying={isPlaying}
                      isBuffering={isBuffering}
                      currentTime={currentTime}
                      duration={duration}
                      progressPercent={progressPercent}
                      externalMuted={externalMuted}
                      lowPower={lowPower}
                      ytBgEnabled={ytBgEnabled}
                      lyricsWindowOpen={lyricsWindowOpen}
                      hasLyricsReady={hasLyricsReady}
                      lyricsLoading={lyricsLoading}
                      playerDragOffset={playerDragOffset}
                      seekBarRef={seekBarRef}
                      isScrubbingRef={isScrubbingRef}
                      onResetDragOffset={() => setPlayerDragOffset({ x: 0, y: 0 })}
                      onToggleYtBg={() => setYtBgEnabled((v) => !v)}
                      onToggleLyricsWindow={() => setLyricsWindowOpen((open) => !open)}
                      onCollapsePlayer={(e) => {
                        e.stopPropagation();
                        setIsPlayerExpanded(false);
                        setPlayerDragOffset({ x: 0, y: 0 });
                      }}
                      onSeekAudioClientX={seekAudioClientX}
                      onRestartTrack={handleRestartTrack}
                      onPrevTrack={(e) => handleStepTrack(-1, e)}
                      onTogglePlayPause={toggleAudioPlayPause}
                      onNextTrack={(e) => handleStepTrack(1, e)}
                      onToggleMute={onToggleMute}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {lyricsWindowOpen && activeTrack && (
          <LyricsCapsuleStage
            album={album}
            track={activeTrack}
            lyricsLoading={lyricsLoading}
            hasLines={lyricLines.length > 0}
            activeLyricIndex={activeLyricIndex}
            currentPrimaryLyric={lyricLines[activeLyricIndex]?.text ?? ''}
            currentSecondaryLyric={lyricLines[activeLyricIndex + 1]?.text ?? ''}
            lineKaraokeRatio={lineKaraokeRatio}
            onClose={() => setLyricsWindowOpen(false)}
          />
        )}
      </div>
    </>
  );
};
