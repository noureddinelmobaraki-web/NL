import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
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
  formatTime: (sec: number) => string;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onVolumeChange: (v: number) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
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
  formatTime,
  onPrev,
  onNext,
  onPlayPause,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle,
  onToggleQueue,
  onClose,
}: NowPlayingBarDesktopProps) => {
  return (
    <>
      <div className="flex items-center gap-3 w-full h-16 shrink-0">
        {/* Left: Cover Art */}
        <div className="relative w-11 h-11 shrink-0">
          <div 
            className={`absolute -inset-1 rounded-full bg-[var(--card-control-bg)] blur-md duration-1000 transition-opacity ${isPlaying ? "opacity-100" : "opacity-0"}`}
          />
          {activeSong.cover || (activeSong as any).backgroundImage ? (
            <img 
              src={activeSong.cover || (activeSong as any).backgroundImage} 
              alt={`${activeSong?.title ?? 'Song'} cover art`} 
              width={44}
              height={44}
              className={`w-full h-full rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${isPlaying ? "animate-[spin_12s_linear_infinite]" : ""}`}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-700 to-neutral-500 flex items-center justify-center" />
          )}
        </div>

        {/* Center: Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[var(--text-primary)] text-sm font-bold truncate tracking-[-0.01em]">
            {activeSong.title}
          </span>
          <span className="text-[8px] text-[var(--text-muted)] font-bold tracking-[0.15em] mt-[1px]">
            NOW PLAYING
          </span>
        </div>

        {/* Desktop Extra Controls (Middle-Right) */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={onShuffleToggle}
            className={`p-2 hover:scale-110 active:scale-95 transition-all outline-none ${isShuffle ? "text-[var(--accent-indigo)]" : "text-[var(--text-muted)]"}`}
            title="Shuffle"
            aria-label={isShuffle ? 'إيقاف العشوائي' : 'تشغيل العشوائي'}
          >
            <Shuffle size={16} aria-hidden="true" />
          </button>
          <button
            onClick={onRepeatToggle}
            className={`p-2 hover:scale-110 active:scale-95 transition-all outline-none ${repeatMode !== 'off' ? "text-[var(--accent-indigo)]" : "text-[var(--text-muted)]"}`}
            title="Repeat"
            aria-label={repeatMode === 'off' ? 'تكرار إيقاف' : repeatMode === 'all' ? 'تكرار الكل' : 'تكرار الأغنية'}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} aria-hidden="true" /> : <Repeat size={16} aria-hidden="true" />}
          </button>
        </div>

        {/* Right: Primary Controls */}
        <div className="flex gap-0.5 items-center">
          <button
            onClick={onPrev}
            aria-label="الأغنية السابقة"
            className="p-2.5 text-[var(--text-secondary)] hover:bg-[var(--card-control-bg)] rounded-full transition-all outline-none"
          >
            <SkipBack size={20} fill="currentColor" aria-hidden="true" />
          </button>

          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-[0_4px_15px_rgba(255,255,255,0.2)] mx-1 hover:scale-105 active:scale-95 shadow-lg outline-none"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" aria-hidden="true" /> : <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
          </button>

          <button
            onClick={onNext}
            aria-label="الأغنية التالية"
            className="p-2.5 text-[var(--text-secondary)] hover:bg-[var(--card-control-bg)] rounded-full transition-all outline-none"
          >
            <SkipForward size={20} fill="currentColor" aria-hidden="true" />
          </button>

          {/* Desktop Hover Controls (Volume/Queue) */}
          {isHovered && (
            <div className="flex items-center gap-2 ml-3">
              <div className="flex items-center gap-2 w-[100px]">
                {volume === 0 ? <VolumeX size={16} className="text-[var(--text-muted)]" /> : <Volume2 size={16} className="text-[var(--text-secondary)]" />}
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider flex-1 h-[3px] cursor-pointer accent-[var(--text-primary)]"
                />
              </div>
              <button
                onClick={onToggleQueue}
                className={`p-2 transition-colors outline-none ${showQueue ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
                title="Queue"
                aria-label={showQueue ? 'إخفاء القائمة' : 'عرض القائمة'}
              >
                <ListMusic size={18} aria-hidden="true" />
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors outline-none"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Seek Section */}
      {isHovered && (
        <div className="px-3 pb-3 flex flex-col gap-1">
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
                background: `linear-gradient(to right, var(--text-primary) ${progress}%, rgba(255,255,255,0.1) ${progress}%)`
              }}
              className="seek-bar w-full h-1.5 appearance-none cursor-pointer rounded-[3px] outline-none accent-[var(--accent-indigo)]"
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] tabular-nums mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Progress line indicator (Visible when not expanded) */}
      {!isHovered && (
        <div 
          style={{
            background: `linear-gradient(to right, var(--text-primary) ${progress}%, transparent ${progress}%)`
          }}
          className="absolute bottom-0 left-0 right-0 h-[3px] opacity-80 transition-opacity duration-300 rounded-b-[28px]"
        />
      )}
    </>
  );
};
