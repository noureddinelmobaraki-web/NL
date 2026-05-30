import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Share2, 
  Check, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  ListMusic, 
  Volume2, 
  VolumeX,
  X
} from "lucide-react";
import { ActiveSong } from "../../types";

export interface NowPlayingBarDesktopProps {
  activeSong: ActiveSong;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isShuffle: boolean;
  repeatMode: "off" | "all" | "one" | string;
  volume: number;
  isHovered: boolean;
  showQueue: boolean;
  showCopied: boolean;
  formatTime: (sec: number) => string;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onVolumeChange: (v: number) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
  onShare: (e: React.MouseEvent) => void;
  onToggleQueue: () => void;
  onClose: () => void;
}

export const NowPlayingBarDesktop = ({
  activeSong,
  isPlaying,
  currentTime,
  duration,
  progress,
  isShuffle,
  repeatMode,
  volume,
  isHovered,
  showQueue,
  showCopied,
  formatTime,
  onPrev,
  onNext,
  onPlayPause,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle,
  onShare,
  onToggleQueue,
  onClose,
}: NowPlayingBarDesktopProps) => {
  return (
    <>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        height: "64px",
        flexShrink: 0
      }}>
        {/* Left: Cover Art */}
        <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
          <div 
            style={{ 
              position: 'absolute', 
              inset: '-4px', 
              borderRadius: '50%', 
              background: `var(--card-control-bg)`, 
              filter: 'blur(8px)',
              opacity: isPlaying ? 1 : 0,
              transition: 'opacity 1s'
            }} 
          />
          {activeSong.cover || (activeSong as any).backgroundImage ? (
            <img 
              src={activeSong.cover || (activeSong as any).backgroundImage} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: isPlaying ? 'spin 12s linear infinite' : 'none'
              }} 
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'linear-gradient(45deg, #333, #666)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} />
          )}
        </div>

        {/* Center: Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ 
            color: "var(--text-primary)", 
            fontSize: "14px", 
            fontWeight: "700", 
            whiteSpace: "nowrap", 
            overflow: "hidden", 
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em"
          }}>
            {activeSong.title}
          </span>
          <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.15em', marginTop: '1px' }}>
            NOW PLAYING
          </span>
        </div>

        {/* Desktop Extra Controls (Middle-Right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
          <button
            onClick={onShuffleToggle}
            style={{ color: isShuffle ? 'var(--accent-indigo)' : 'var(--text-muted)', padding: '8px' }}
            className="hover:scale-110 active:scale-95 transition-all outline-none"
            title="Shuffle"
            aria-label={isShuffle ? 'إيقاف العشوائي' : 'تشغيل العشوائي'}
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={onRepeatToggle}
            style={{ color: repeatMode !== 'off' ? 'var(--accent-indigo)' : 'var(--text-muted)', padding: '8px' }}
            className="hover:scale-110 active:scale-95 transition-all outline-none"
            title="Repeat"
            aria-label={repeatMode === 'off' ? 'تكرار إيقاف' : repeatMode === 'all' ? 'تكرار الكل' : 'تكرار الأغنية'}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Right: Primary Controls */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          <button
            onClick={onPrev}
            style={{ color: "var(--text-secondary)", padding: "10px" }}
            className="hover:bg-[var(--card-control-bg)] rounded-full transition-all outline-none"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{ 
              width: "48px", 
              height: "48px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: "50%", 
              background: "var(--text-primary)", 
              color: "var(--text-inverse)",
              boxShadow: '0 4px 15px rgba(255,255,255,0.2)',
              margin: '0 4px'
            }}
            className="hover:scale-105 active:scale-95 shadow-lg outline-none"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={onNext}
            style={{ color: "var(--text-secondary)", padding: "10px" }}
            className="hover:bg-[var(--card-control-bg)] rounded-full transition-all outline-none"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          {/* Desktop Hover Controls (Volume/Queue) */}
          {isHovered && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100px' }}>
                {volume === 0 ? <VolumeX size={16} style={{ color: 'var(--text-muted)' }} /> : <Volume2 size={16} style={{ color: 'var(--text-secondary)' }} />}
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider"
                  style={{ flex: 1, height: '3px', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                />
              </div>
              <button
                onClick={onToggleQueue}
                style={{ color: showQueue ? 'var(--text-primary)' : 'var(--text-muted)', padding: '8px' }}
                className="hover:text-[var(--text-primary)] transition-colors outline-none"
                title="Queue"
                aria-label={showQueue ? 'إخفاء القائمة' : 'عرض القائمة'}
              >
                <ListMusic size={18} />
              </button>
            </div>
          )}

          <button
            onClick={onShare}
            style={{ 
              color: showCopied ? "var(--accent-green)" : "var(--text-muted)", 
              padding: "10px", 
              borderRadius: "50%", 
              transition: "all 0.3s",
              position: 'relative'
            }}
            className="hover:bg-[var(--card-control-bg)] outline-none"
            title="Share"
            aria-label="مشاركة الأغنية"
          >
            {showCopied ? <Check size={18} /> : <Share2 size={18} />}
          </button>

          <button
            onClick={onClose}
            style={{ 
              color: "var(--text-muted)", 
              padding: "10px", 
            }}
            className="hover:text-[var(--text-primary)] transition-colors outline-none"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Seek Section */}
      {isHovered && (
        <div style={{
          padding: "0 12px 12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div className="relative w-full py-3 -my-3 cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              step={0.1}
              onChange={(e) => {
                if (activeSong.audioRef.current) {
                  activeSong.audioRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              style={{ 
                width: '100%', 
                height: '6px',
                background: `linear-gradient(to right, var(--text-primary) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`,
                appearance: 'none',
                cursor: 'pointer',
                borderRadius: '3px',
                outline: 'none',
                '--thumb-size': '14px',
                accentColor: 'var(--accent-indigo)'
              } as any}
              className="seek-bar"
            />
          </div>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            fontSize: "10px", 
            color: "var(--text-muted)", 
            fontVariantNumeric: "tabular-nums",
            marginTop: "4px"
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Progress line indicator (Visible when not expanded) */}
      {!isHovered && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(to right, var(--text-primary) ${progress}%, transparent ${progress}%)`,
          opacity: 0.8,
          transition: "opacity 300ms",
          borderBottomLeftRadius: '28px',
          borderBottomRightRadius: '28px',
        }} />
      )}
    </>
  );
};
