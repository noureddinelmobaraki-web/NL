import type { Song, LyricLine } from '../../types';
import { LyricsWindowContent } from '../LyricsEngine';
import { formatTime } from './formatTime';

interface SongCardLyricsPanelProps {
  layoutType: 'inline' | 'popover';
  song: Song;
  isLyricsOpen: boolean;
  resolvedTheme: string;
  karaokeMode: boolean;
  setKaraokeMode?: (v: boolean | ((p: boolean) => boolean)) => void;
  localLyrics: LyricLine[];
  currentLineIndex: number;
  currentLyricLine?: string | null;
  currentTime?: number;
  onSeek?: (v: number) => void;
  isMobile?: boolean;
}

const isHeaderLineHelper = (text: string): boolean => {
  const t = text.trim().toLowerCase();
  return (
    t.includes('intro') ||
    t.includes('chorus') ||
    t.includes('verse') ||
    t.includes('hook') ||
    t.includes('bridge') ||
    t.includes('outro') ||
    t.includes('solo') ||
    t.includes('instrumental')
  );
};

export const SongCardLyricsPanel = ({
  layoutType,
  song,
  isLyricsOpen,
  resolvedTheme,
  karaokeMode,
  localLyrics,
  currentLineIndex,
  currentLyricLine,
  currentTime,
  onSeek,
  isMobile = false,
}: SongCardLyricsPanelProps) => {
  if (!isLyricsOpen) return null;

  // Song has no lyrics file — show a "not available" placeholder
  if (!song.lrc) {
    return (
      <div
        style={{
          marginTop: '16px',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '80px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed rgba(255, 255, 255, 0.08)',
        }}
      >
        <span
          style={{
            fontSize: '1.5rem',
            opacity: 0.4,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          ♪
        </span>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontFamily: 'var(--nav-font, monospace)',
            letterSpacing: '0.08em',
            textAlign: 'center',
            margin: 0,
          }}
        >
          الكلمات غير متوفرة حالياً
        </p>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.68rem',
            opacity: 0.5,
            textAlign: 'center',
            margin: 0,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          LYRICS NOT AVAILABLE
        </p>
      </div>
    );
  }

  // ── Render inline (within active controls) for Dark/Manga themes ──
  if (layoutType === 'inline') {
    if (resolvedTheme === 'light') return null;

    return (
      <>
        {karaokeMode ? (
          <div style={{
            marginTop: '16px',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid var(--card-border-line)',
            paddingTop: '12px',
          }}>
            <p style={{
              fontFamily: 'var(--font-manga)',
              fontSize: 'clamp(1.2rem, 4vw, 2rem)',
              color: 'var(--lyric-active-color)',
              textAlign: 'center',
              letterSpacing: '0.05em',
              textShadow: '0 0 20px var(--lyric-active-shadow)',
              transition: 'all 0.3s ease',
              lineHeight: 1.4,
              padding: '0 16px',
            }}>
              {currentLyricLine || '♪'}
            </p>
          </div>
        ) : (
          <div style={{
            marginTop: '16px',
            borderTop: '1px solid var(--card-border-line)',
            paddingTop: '12px',
            maxHeight: '220px',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }} className="no-scrollbar">
            {!localLyrics || localLyrics.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontFamily: 'monospace',
                opacity: 0.6,
              }}>
                ♪ جاري تحميل الكلمات...
              </div>
            ) : (
              <LyricsWindowContent
                currentTime={currentTime || 0}
                onSeek={onSeek || (() => {})}
                lyrics={localLyrics}
                isMobilePlayer={true}
              />
            )}
          </div>
        )}
      </>
    );
  }

  // ── Render absolute floating popover for Light theme ──
  if (layoutType === 'popover') {
    if (resolvedTheme !== 'light') return null;

    return (
      <div 
        className="light-lyrics-card-popover absolute bg-white p-4 z-50 rounded-lg flex flex-col"
        style={{
          top: '100%',
          right: isMobile ? 'auto' : '16px',
          left: isMobile ? '50%' : 'auto',
          transform: isMobile ? 'translateX(-50%)' : 'none',
          width: isMobile ? '92vw' : '345px',
          height: '330px',
          marginTop: '12px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .light-lyrics-card-popover {
            box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.06);
            border: 1px solid rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar {
            width: 14px !important;
            display: block !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-track {
            background: #FFFFFF !important;
            border-left: 1px solid #E5E7EB !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-thumb {
            background: #C1C1C1 !important;
            border-radius: 9px !important;
            border: 3px solid #FFFFFF !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #A8A8A8 !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button {
            background-color: #FFFFFF !important;
            display: block !important;
            height: 14px !important;
            width: 14px !important;
            border-left: 1px solid #E5E7EB !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button:decrement {
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='18 15 12 9 6 15'></polyline></svg>") !important;
            background-repeat: no-repeat !important;
            background-size: 8px !important;
            background-position: center !important;
            border-bottom: 1px solid #E5E7EB !important;
          }
          .light-lyrics-scroll-container::-webkit-scrollbar-button:single-button:increment {
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") !important;
            background-repeat: no-repeat !important;
            background-size: 8px !important;
            background-position: center !important;
            border-top: 1px solid #E5E7EB !important;
          }
        `}</style>

        <div 
          className="light-lyrics-scroll-container flex-1 overflow-y-auto pr-1 select-text" 
          style={{
            maxHeight: '100%',
            scrollbarWidth: 'auto',
          }}
        >
          {!localLyrics || localLyrics.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-400 text-xs font-mono">
              ♪ جاري تحميل الكلمات...
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-left py-2 font-sans">
              {localLyrics.map((line, i) => {
                const isActive = i === currentLineIndex;
                const isHeader = isHeaderLineHelper(line.text);
                
                if (isHeader) {
                  return (
                    <div 
                      key={`lyric-${i}-${line.time}`}
                      id={`light-lyric-line-${i}`}
                      className="text-gray-400 text-[12px] font-semibold tracking-wider uppercase py-1 select-none font-sans mt-2 first:mt-0"
                    >
                      {formatTime(line.time)} {line.text}
                    </div>
                  );
                }

                return (
                  <div
                    key={`lyric-${i}-${line.time}`}
                    id={`light-lyric-line-${i}`}
                    onClick={() => onSeek?.(line.time)}
                    className="lyric-line-item relative px-2.5 py-1.5 transition-all text-left cursor-pointer rounded select-text"
                    style={{
                      fontFamily: 'Geneva, Arial, sans-serif',
                      fontSize: '14px',
                      fontWeight: 'normal',
                      color: '#000000',
                      lineHeight: '1.45',
                      background: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                      transition: 'background-color 0.2s ease, transform 0.2s ease',
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
