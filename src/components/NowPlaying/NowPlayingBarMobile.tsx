import { useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Shuffle, Repeat, Repeat1 } from "lucide-react";
import { ActiveSong } from "../../types";
import { formatTime } from "../songs/formatTime";

export interface NowPlayingBarMobileProps {
  activeSong: ActiveSong;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onSeek: (val: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
  onClose: () => void;
}

const TOUCH_BTN: React.CSSProperties = {
  minWidth: '44px',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  borderRadius: '50%',
};

const PRIMARY_BTN: React.CSSProperties = {
  ...TOUCH_BTN,
  width: '44px',
  height: '44px',
  background: 'var(--text-primary)',
  color: 'var(--text-inverse)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
};

export const NowPlayingBarMobile = ({
  activeSong,
  isPlaying,
  progress,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  onSeek,
  onPrev,
  onNext,
  onPlayPause,
  onShuffleToggle,
  onRepeatToggle,
  onClose,
}: NowPlayingBarMobileProps) => {
  const seekRef = useRef<HTMLInputElement>(null);

  const handleLyricsClick = () => {
    // Notifies the matching SongCard to open its bottom sheet
    document.dispatchEvent(new CustomEvent('open-song-lyrics', {
      detail: { songId: activeSong.id }
    }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!duration) return;
    const pct = Number(e.target.value);
    onSeek((pct / 100) * duration);
  };

  return (
    <div 
      className="now-playing-bar mid-player"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px 8px 4px',
      }}
    >
      {/* ── Row 1: cover + title + primary actions ────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        {/* Cover */}
        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
          {activeSong.cover ? (
            <img
              src={activeSong.cover}
              alt={`${activeSong.title} cover`}
              width={40}
              height={40}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', borderRadius: '8px',
              background: 'var(--card-control-bg, linear-gradient(45deg, #333, #666))',
            }} />
          )}
        </div>

        {/* Title + tag */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}>
            {activeSong.title}
          </span>
          <span style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginTop: '2px',
          }}>
            NOW PLAYING
          </span>
        </div>

        {/* Lyrics button (only when song has LRC) */}
        <button
          onClick={handleLyricsClick}
          aria-label="فتح الكلمات"
          style={{ ...TOUCH_BTN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/lyrics.svg"
            alt="Lyrics"
            style={{
              width: '24px',
              height: '24px',
              display: 'block',
              pointerEvents: 'none',
              filter: 'invert(1) brightness(2)',
            }}
          />
        </button>

        {/* Prev */}
        <button onClick={onPrev} aria-label="السابق" style={TOUCH_BTN}>
          <SkipBack size={20} aria-hidden="true" />
        </button>

        {/* Play/Pause (primary) */}
        <button onClick={onPlayPause} aria-label={isPlaying ? 'إيقاف' : 'تشغيل'} style={PRIMARY_BTN}>
          {isPlaying
            ? <Pause size={18} fill="currentColor" aria-hidden="true" />
            : <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} aria-hidden="true" />}
        </button>

        {/* Next */}
        <button onClick={onNext} aria-label="التالي" style={TOUCH_BTN}>
          <SkipForward size={20} aria-hidden="true" />
        </button>

        {/* Close */}
        <button onClick={onClose} aria-label="إغلاق" style={{ ...TOUCH_BTN, color: 'var(--text-muted)' }}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* ── Row 2: seek bar + time + shuffle/repeat ──────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '0 4px' }}>
        <button
          onClick={onShuffleToggle}
          aria-label="عشوائي"
          aria-pressed={isShuffle}
          style={{ ...TOUCH_BTN, minWidth: '32px', minHeight: '32px', color: isShuffle ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          <Shuffle size={14} />
        </button>

        <span style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: 'var(--text-muted)',
          minWidth: '32px',
          textAlign: 'center',
        }}>{formatTime(currentTime || 0)}</span>

        <input
          ref={seekRef}
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          aria-label="شريط التقدم"
          className="np-mobile-seek"
          style={{
            flex: 1,
            height: '4px',
            background: `linear-gradient(to right, var(--text-primary) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
            borderRadius: '2px',
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            touchAction: 'manipulation',
            cursor: 'pointer',
            ['--seek-progress' as any]: `${progress}%`
          }}
        />

        <span style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: 'var(--text-muted)',
          minWidth: '32px',
          textAlign: 'center',
        }}>{formatTime(duration || 0)}</span>

        <button
          onClick={onRepeatToggle}
          aria-label={`تكرار: ${repeatMode}`}
          aria-pressed={repeatMode !== 'off'}
          style={{ ...TOUCH_BTN, minWidth: '32px', minHeight: '32px', color: repeatMode !== 'off' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {repeatMode === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
        </button>
      </div>

      <style>{`
        .np-mobile-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--text-primary);
          border: 2px solid var(--bg-glass-strong, rgba(0,0,0,0.4));
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .np-mobile-seek::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--text-primary);
          border: 2px solid var(--bg-glass-strong, rgba(0,0,0,0.4));
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
