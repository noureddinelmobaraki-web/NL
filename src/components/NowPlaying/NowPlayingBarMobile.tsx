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
        gap: '6px',
        padding: '8px 10px 6px',
        background: 'rgba(11, 15, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Row 1: cover + title + primary actions ────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '8px 12px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Cover */}
        <div style={{
          position: 'relative',
          width: '44px',
          height: '44px',
          flexShrink: 0,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
        }}>
          {activeSong.cover ? (
            <img
              src={activeSong.cover}
              alt={`${activeSong.title} cover`}
              width={44}
              height={44}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', borderRadius: '12px',
              background: 'var(--card-control-bg, linear-gradient(45deg, #333, #666))',
            }} />
          )}
        </div>

        {/* Title + tag */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
            letterSpacing: '0.2px',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}>
            {activeSong.title}
          </span>
          <span style={{
            fontSize: '9px',
            color: '#34E89E',
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(52,232,158,0.4)',
          }}>
            NOW PLAYING
          </span>
        </div>

        {/* Lyrics button (only when song has LRC) */}
        <button
          onClick={handleLyricsClick}
          aria-label="فتح الكلمات"
          style={{
            ...TOUCH_BTN,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FF7A1A',
            boxShadow: '0 0 10px rgba(255,122,26,0.15)',
          }}
        >
          <img
            src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/lyrics.svg"
            alt="Lyrics"
            style={{
              width: '22px',
              height: '22px',
              display: 'block',
              pointerEvents: 'none',
              filter: 'invert(87%) sepia(50%) saturate(1200%) hue-rotate(340deg) brightness(1.2)',
            }}
          />
        </button>

        {/* Prev */}
        <button 
          onClick={onPrev} 
          aria-label="السابق" 
          style={{
            ...TOUCH_BTN,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FF7A1A',
            boxShadow: '0 0 10px rgba(255,122,26,0.15)',
          }}
        >
          <SkipBack size={18} fill="currentColor" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,26,0.5))' }} />
        </button>

        {/* Play/Pause (primary) */}
        <button 
          onClick={onPlayPause} 
          aria-label={isPlaying ? 'إيقاف' : 'تشغيل'} 
          style={{
            ...PRIMARY_BTN,
            background: isPlaying
              ? 'linear-gradient(135deg, #53f2a6 0%, #34E89E 100%)'
              : 'linear-gradient(135deg, #ff6a00 0%, #FF7A1A 100%)',
            color: '#090d16',
            boxShadow: isPlaying
              ? '0 0 16px rgba(52,232,158,0.5), inset 0 1px 0 rgba(255,255,255,0.4)'
              : '0 0 16px rgba(255,122,26,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.4)',
            width: '46px',
            height: '46px',
          }}
        >
          {isPlaying
            ? <Pause size={20} fill="currentColor" aria-hidden="true" />
            : <Play size={20} fill="currentColor" style={{ marginLeft: '3px' }} aria-hidden="true" />}
        </button>

        {/* Next */}
        <button 
          onClick={onNext} 
          aria-label="التالي" 
          style={{
            ...TOUCH_BTN,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#34E89E',
            boxShadow: '0 0 10px rgba(52,232,158,0.15)',
          }}
        >
          <SkipForward size={18} fill="currentColor" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 4px rgba(52,232,158,0.5))' }} />
        </button>

        {/* Close */}
        <button 
          onClick={onClose} 
          aria-label="إغلاق" 
          style={{
            ...TOUCH_BTN,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ff4d4d',
            boxShadow: '0 0 10px rgba(255,77,77,0.15)',
          }}
        >
          <X size={18} aria-hidden="true" style={{ strokeWidth: 2.5 }} />
        </button>
      </div>

      {/* ── Row 2: seek bar + time + shuffle/repeat ──────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '6px 12px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <button
          onClick={onShuffleToggle}
          aria-label="عشوائي"
          aria-pressed={isShuffle}
          style={{
            ...TOUCH_BTN,
            minWidth: '32px',
            minHeight: '32px',
            width: '32px',
            height: '32px',
            background: isShuffle ? 'rgba(255, 122, 26, 0.18)' : 'transparent',
            border: isShuffle ? '1px solid rgba(255, 122, 26, 0.35)' : '1px solid transparent',
            color: isShuffle ? '#FF7A1A' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: isShuffle ? '0 0 8px rgba(255,122,26,0.25)' : 'none',
          }}
        >
          <Shuffle size={14} />
        </button>

        <span style={{
          fontFamily: 'monospace',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.6)',
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
            height: '6px',
            background: `linear-gradient(to right, #FF7A1A 0%, #34E89E ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
            borderRadius: '3px',
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
          color: 'rgba(255,255,255,0.6)',
          minWidth: '32px',
          textAlign: 'center',
        }}>{formatTime(duration || 0)}</span>

        <button
          onClick={onRepeatToggle}
          aria-label={`تكرار: ${repeatMode}`}
          aria-pressed={repeatMode !== 'off'}
          style={{
            ...TOUCH_BTN,
            minWidth: '32px',
            minHeight: '32px',
            width: '32px',
            height: '32px',
            background: repeatMode !== 'off' ? 'rgba(52, 232, 158, 0.18)' : 'transparent',
            border: repeatMode !== 'off' ? '1px solid rgba(52, 232, 158, 0.35)' : '1px solid transparent',
            color: repeatMode !== 'off' ? '#34E89E' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: repeatMode !== 'off' ? '0 0 8px rgba(52,232,158,0.25)' : 'none',
          }}
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
          background: #34E89E;
          border: 2.5px solid #090d16;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(52,232,158,0.8), 0 2px 6px rgba(0,0,0,0.5);
          transition: transform 0.1s ease;
        }
        .np-mobile-seek::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
        .np-mobile-seek::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #34E89E;
          border: 2.5px solid #090d16;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(52,232,158,0.8);
        }
      `}</style>
    </div>
  );
};
