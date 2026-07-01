import { useState } from 'react';
import { Play, Pause, Share2 as ShareIcon, Check } from 'lucide-react';
import type { Song } from '../../types';
import { songShareUrl } from '../../features/music/data/shareSong';

interface SongCardHeaderProps {
  song: Song;
  index: number;
  isActive: boolean;
  isActiveInBar: boolean;
  isPlaying: boolean;
  isWaiting: boolean;
  isMobile: boolean;
  isTablet: boolean;
  resolvedTheme: string;
  isLyricsOpen: boolean;
  duration?: number;
  onPlay: () => void;
  onPlayPause?: () => void;
  onToggleLyrics: () => void;
}

export const SongCardHeader = ({
  song,
  index,
  isActive,
  isActiveInBar,
  isPlaying,
  isWaiting,
  isMobile,
  isTablet,
  resolvedTheme,
  isLyricsOpen,
  duration,
  onPlay,
  onPlayPause,
  onToggleLyrics,
}: SongCardHeaderProps) => {
  const isTouch = isMobile || isTablet;
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = songShareUrl({ id: String(song.id) });
    
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: song.title,
          text: `استمع لـ "${song.title}" — NL`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.log('navigator.share failed or aborted, falling back to clipboard copy:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  // FIXED: Lyrics button — visible on ALL themes via solid purple bg + border.
  //   - 44x44px on mobile/tablet (iOS HIG minimum)
  //   - 32x32px on desktop (denser layout)
  //   - Clear ♪ / ✕ icon instead of opaque ◉
  //   - aria-pressed for screen readers
  const lyricsBtnSize = isTouch ? 44 : 32;
  const lyricsBtnFontSize = isTouch ? 18 : 12;
  const lyricsBtnBg = isLyricsOpen
    ? 'rgba(239, 68, 68, 0.95)'         // solid red when active
    : 'rgba(139, 92, 246, 0.25)';        // soft purple when idle — visible on all themes
  const lyricsBtnBorder = isLyricsOpen
    ? '1px solid rgba(239, 68, 68, 0.5)'
    : '1px solid rgba(139, 92, 246, 0.55)';
  const lyricsBtnColor = isLyricsOpen ? '#fff' : 'rgba(255, 255, 255, 0.95)';

  // FIXED: Play button — guaranteed 44x44px touch target on mobile/tablet
  const playBtnSize = isTouch ? 44 : 44;

  return (
    <div className={`flex items-center justify-between gap-3 w-full ${isTouch ? 'h-full' : ''}`}>
      {/* Thumbnail + Title/Artist (Left) */}
      <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
        {isTouch ? (
          <div style={{
            position: 'relative',
            width: 54,
            height: 54,
            flexShrink: 0,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            <img 
              src={song.cover || song.backgroundImage} 
              alt={song.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {isActive && isPlaying && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 2,
                padding: '0 0 6px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)',
                pointerEvents: 'none',
              }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 3,
                      height: 12,
                      borderRadius: 1.5,
                      background: 'var(--text-primary, #fff)',
                      animation: `mb-wave 0.9s ease-in-out ${i * 0.13}s infinite`,
                      transformOrigin: 'bottom',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className={`font-mono text-xs font-bold ${isActive ? (resolvedTheme === 'light' ? 'text-[#0000CC]' : 'text-indigo-400') : (resolvedTheme === 'light' ? 'text-[#777]' : 'text-zinc-400')}`}>
            {(index + 1).toString().padStart(2, '0')}
          </span>
        )}
        <div className="flex flex-col min-w-0">
          <h3 
            lang="ar"
            className={`font-bold tracking-tight ${resolvedTheme === 'light' ? 'text-[#000]' : 'rainbow-text'}`}
            style={{
              ...(isTouch ? {
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                ...(resolvedTheme === 'light' ? { fontFamily: 'Geneva, sans-serif' } : {
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                })
              } : (resolvedTheme === 'light' ? { fontFamily: 'Geneva, sans-serif', fontSize: '1.125rem' } : {
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
              })),
              ...(song.id === 1 ? {
                fontStyle: 'italic',
                lineHeight: '13px',
                fontSize: '10.6px',
                borderColor: '#41fae6',
                backgroundColor: '#291818',
              } : {})
            }}
          >
            {song.title}
          </h3>
          <div className="flex items-center gap-2 mt-1" style={isTouch ? { fontSize: 11 } : {}}>
            <span 
              className={`font-bold uppercase tracking-wider rounded ${
                song.lrc 
                  ? (resolvedTheme === 'light' ? 'bg-[#0000CC] text-white' : 'bg-indigo-500/30 text-indigo-200') 
                  : (resolvedTheme === 'light' ? 'bg-[#999] text-white' : 'bg-zinc-800/80 text-zinc-400')
              }`}
              style={isTouch 
                ? { fontSize: 11, padding: '1px 6px', letterSpacing: '0.06em' } 
                : { fontSize: 9, padding: '2px 4px' }}
            >
              {song.lrc ? "LRC" : "INST"}
            </span>
            {isTouch ? (
              duration ? (
                <span className="font-mono uppercase text-zinc-400" style={{
                  fontSize: 11,
                  color: 'var(--text-muted, rgba(255,255,255,0.55))',
                  letterSpacing: '0.04em',
                }}>
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </span>
              ) : null
            ) : (
              <span className="text-[10px] text-zinc-400/80 font-mono uppercase">Noureddin</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Duration + Play (Right) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        
        <div className="flex items-center gap-1.5" style={{ position: 'relative', zIndex: 5 }}>
          {song.lrc && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLyrics(); }}
              className={`lyrics-btn-compact ${isLyricsOpen ? 'active' : ''}`}
              aria-label={isLyricsOpen ? 'إغلاق كلمات الأغنية' : 'فتح كلمات الأغنية'}
              aria-pressed={isLyricsOpen}
              title={isLyricsOpen ? 'Close Lyrics' : 'Show Lyrics'}
              style={{
                width: `${lyricsBtnSize}px`,
                height: `${lyricsBtnSize}px`,
                minWidth: `${lyricsBtnSize}px`,
                minHeight: `${lyricsBtnSize}px`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: lyricsBtnBg,
                color: lyricsBtnColor,
                border: lyricsBtnBorder,
                fontSize: `${lyricsBtnFontSize}px`,
                fontWeight: 700,
                lineHeight: 1,
                cursor: 'pointer',
                transition: 'transform 150ms ease, background 200ms ease',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                boxShadow: isLyricsOpen
                  ? '0 2px 8px rgba(239, 68, 68, 0.4)'
                  : '0 2px 6px rgba(139, 92, 246, 0.25)',
                flexShrink: 0,
                position: 'relative',
                zIndex: 5,
              }}
            >
              {isLyricsOpen ? (
                '✕'
              ) : (
                <img
                  src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/lyrics.svg"
                  alt="Lyrics"
                  style={{
                    width: isTouch ? '22px' : '15px',
                    height: isTouch ? '22px' : '15px',
                    display: 'block',
                    pointerEvents: 'none',
                    filter: 'invert(1) brightness(2)',
                    transition: 'transform 150ms ease',
                  }}
                />
              )}
            </button>
          )}

          <button
            type="button"
            aria-label="مشاركة الأغنية"
            onClick={handleShare}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: copied 
                ? '#10B981'
                : (resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.65)'),
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
              position: 'relative',
            }}
            className="hover:scale-105 active:scale-95 transition-transform"
            title={copied ? 'تم نسخ الرابط!' : 'مشاركة الأغنية'}
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <ShareIcon size={18} />}
            {copied && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap animate-bounce font-sans">
                تم نسخ الرابط!
              </span>
            )}
          </button>

          {!isActiveInBar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isActive && onPlayPause) {
                  onPlayPause();
                } else {
                  onPlay();
                }
              }}
              className={`
                flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90
                ${resolvedTheme === 'light' ? 'bg-[#F0EBE3] border border-[#999] rounded-none' : 'rounded-full'}
                ${isActive && isPlaying && resolvedTheme !== 'light'
                  ? 'bg-white text-black scale-105' 
                  : (resolvedTheme === 'light' ? 'text-black' : 'bg-white/10 text-white hover:bg-white/20')}
              `}
              style={{
                width: `${playBtnSize}px`,
                height: `${playBtnSize}px`,
                minWidth: `${playBtnSize}px`,
                minHeight: `${playBtnSize}px`,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
                ...(resolvedTheme === 'light' ? { boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000' } : {}),
              }}
              aria-label={isActive && isPlaying ? "Pause" : "Play"}
            >
              {isActive && isWaiting ? (
                <div className="spinner !w-4 !h-4 border-white border-t-transparent" aria-hidden="true" />
              ) : (
                isActive && isPlaying ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="ml-0.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
