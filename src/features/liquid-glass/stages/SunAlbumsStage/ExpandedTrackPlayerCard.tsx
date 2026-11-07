/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/SunAlbumsStage/ExpandedTrackPlayerCard.tsx
 *
 * Expanded track player card inside a selected track tube.
 */

import React from 'react';
import {
  ChevronUp,
  Move,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LiquidGlassAlbum, LiquidGlassTrack } from '../../albumsData';
import { formatTrackTime } from './fisheyeMeshMath';
import { LyricsExpressiveIcon, YoutubeExpressiveIcon } from './LyricsCapsuleStage';

export interface ExpandedTrackPlayerCardProps {
  album: LiquidGlassAlbum;
  track: LiquidGlassTrack;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  progressPercent: number;
  externalMuted: boolean;
  lowPower: boolean;
  ytBgEnabled: boolean;
  lyricsWindowOpen: boolean;
  hasLyricsReady: boolean;
  lyricsLoading: boolean;
  playerDragOffset: { x: number; y: number };
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  isScrubbingRef: React.MutableRefObject<boolean>;
  onResetDragOffset: () => void;
  onToggleYtBg: () => void;
  onToggleLyricsWindow: () => void;
  onCollapsePlayer: (e: React.MouseEvent) => void;
  onSeekAudioClientX: (clientX: number) => void;
  onRestartTrack: (e: React.MouseEvent) => void;
  onPrevTrack: (e: React.MouseEvent) => void;
  onTogglePlayPause: (e: React.MouseEvent) => void;
  onNextTrack: (e: React.MouseEvent) => void;
  onToggleMute: () => void;
}

export const ExpandedTrackPlayerCard: React.FC<ExpandedTrackPlayerCardProps> = ({
  album,
  track,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  progressPercent,
  externalMuted,
  lowPower,
  ytBgEnabled,
  lyricsWindowOpen,
  hasLyricsReady,
  lyricsLoading,
  playerDragOffset,
  seekBarRef,
  isScrubbingRef,
  onResetDragOffset,
  onToggleYtBg,
  onToggleLyricsWindow,
  onCollapsePlayer,
  onSeekAudioClientX,
  onRestartTrack,
  onPrevTrack,
  onTogglePlayPause,
  onNextTrack,
  onToggleMute,
}) => (
  <div className="lg-expanded-player-card" onClick={(e) => e.stopPropagation()}>
    <div className="lg-expanded-player__top">
      <div className="lg-expanded-player__identity">
        <div
          className={`lg-expanded-player__thumb-wrap${
            isPlaying ? ' lg-expanded-player__thumb-wrap--playing' : ''
          }`}
        >
          <img
            src={album.coverUrl}
            alt={album.title}
            className="lg-expanded-player__thumb"
            draggable={false}
          />
          <span className="lg-expanded-player__thumb-ring" aria-hidden="true" />
        </div>

        <div className="lg-expanded-player__titles">
          <span className="lg-expanded-player__song-title">{track.title}</span>
          <span className="lg-expanded-player__album-sub">
            {album.title} • {album.artist.split(',')[0]}
          </span>
        </div>
      </div>

      <div className="lg-expanded-player__top-actions">
        {(playerDragOffset.x !== 0 || playerDragOffset.y !== 0) && (
          <button
            type="button"
            className="lg-tube-icon-btn"
            onClick={onResetDragOffset}
            title="إعادة المشغل لمكانه"
            aria-label="إعادة المشغل لمكانه"
          >
            <Move size={14} />
          </button>
        )}

        {!lowPower && (
          <button
            type="button"
            className={`lg-tube-icon-btn lg-yt-toggle-btn${
              ytBgEnabled ? ' lg-yt-toggle-btn--active' : ''
            }`}
            onClick={onToggleYtBg}
            title="تبديل فيديو يوتيوب في الخلفية"
            aria-label="تبديل فيديو يوتيوب في الخلفية"
            aria-pressed={ytBgEnabled}
          >
            <YoutubeExpressiveIcon active={ytBgEnabled} />
          </button>
        )}

        <button
          type="button"
          className={`lg-tube-lyrics-btn${
            lyricsWindowOpen ? ' lg-tube-lyrics-btn--active' : ''
          }${hasLyricsReady ? ' lg-tube-lyrics-btn--ready' : ''}`}
          onClick={onToggleLyricsWindow}
          title="عرض الكلمات المتزامنة"
          aria-label="نافذة الكلمات المتزامنة"
          aria-pressed={lyricsWindowOpen}
        >
          <LyricsExpressiveIcon />
          {lyricsLoading && <span className="lg-tube-lyrics-dot" aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="lg-tube-icon-btn"
          onClick={onCollapsePlayer}
          title="طي المشغل"
          aria-label="طي المشغل إلى الأنبوب"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    </div>

    <div className="lg-expanded-player__progress-section">
      <div
        ref={seekBarRef}
        className="lg-seek-hit lg-tube-seek-hit"
        role="slider"
        tabIndex={0}
        aria-label="تقديم أو ترجيع الأغنية"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime || 0)}
        onPointerDown={(e) => {
          e.stopPropagation();
          isScrubbingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeekAudioClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!isScrubbingRef.current) return;
          e.stopPropagation();
          onSeekAudioClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          if (!isScrubbingRef.current) return;
          e.stopPropagation();
          isScrubbingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
      >
        <div className="lg-seek-track lg-tube-seek-track">
          <div className="lg-seek-fill lg-tube-seek-fill" style={{ width: `${progressPercent}%` }}>
            <span className="lg-seek-fill__wave" aria-hidden="true" />
          </div>
          <div className="lg-seek-thumb lg-tube-seek-thumb" style={{ left: `${progressPercent}%` }} />
          <div className="lg-seek-tube-gloss" aria-hidden="true" />
        </div>
      </div>

      <div className="lg-expanded-player__time-row">
        <span>{formatTrackTime(currentTime)}</span>
        <span>{formatTrackTime(duration)}</span>
      </div>
    </div>

    <div className="lg-expanded-player__controls-row">
      <button
        type="button"
        className="lg-player-side-btn"
        onClick={onRestartTrack}
        title="إعادة الأغنية من البداية"
        aria-label="إعادة الأغنية من البداية"
      >
        <RotateCcw size={18} strokeWidth={2.2} />
      </button>

      <div className="lg-player-center-trio">
        <button
          type="button"
          className="lg-player-trio-btn"
          onClick={onPrevTrack}
          title="الأغنية السابقة"
          aria-label="الأغنية السابقة"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          type="button"
          className="lg-player-trio-btn lg-player-trio-btn--primary"
          onClick={onTogglePlayPause}
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isBuffering ? (
            <span className="lg-tube-mini-spinner" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          className="lg-player-trio-btn"
          onClick={onNextTrack}
          title="الأغنية التالية"
          aria-label="الأغنية التالية"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      <button
        type="button"
        className="lg-player-side-btn"
        onClick={onToggleMute}
        title={externalMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
        aria-label={externalMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
      >
        {externalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  </div>
);
