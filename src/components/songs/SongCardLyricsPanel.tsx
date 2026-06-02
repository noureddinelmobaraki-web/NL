import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  isTablet?: boolean;
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
  currentTime,
  onSeek,
  isMobile = false,
  isTablet = false,
}: SongCardLyricsPanelProps) => {
  const mobileScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile && mobileScrollContainerRef.current && currentLineIndex !== -1) {
      const container = mobileScrollContainerRef.current;
      const activeEl = container.querySelector(`#light-lyric-line-mobile-${currentLineIndex}`) as HTMLElement;
      if (activeEl) {
        // Keeps active line at exactly 40% from container top
        const targetScroll = activeEl.offsetTop - (container.clientHeight * 0.4);
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    }
  }, [currentLineIndex, isMobile, localLyrics]);

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
              textAlign: 'center',
              letterSpacing: '0.05em',
              lineHeight: 1.4,
              padding: '0 16px',
            }}>
              {currentLineIndex !== -1 && localLyrics[currentLineIndex] ? (
                (() => {
                  const activeLine = localLyrics[currentLineIndex];
                  if (activeLine.words && activeLine.words.length > 0) {
                    const ct = currentTime || 0;
                    return activeLine.words.map((word, wordIndex) => {
                      const isPlayed = word.time <= ct;
                      return (
                        <span
                          key={wordIndex}
                          style={{
                            color: isPlayed ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)',
                            opacity: isPlayed ? 1 : 0.45,
                            textShadow: isPlayed ? '0 0 20px var(--lyric-active-shadow)' : 'none',
                            transition: 'all 0.15s ease-out',
                            display: 'inline-block',
                            whiteSpace: 'pre',
                          }}
                        >
                          {word.text}
                        </span>
                      );
                    });
                  } else {
                    return (
                      <span style={{
                        color: 'var(--lyric-active-color)',
                        textShadow: '0 0 20px var(--lyric-active-shadow)',
                      }}>
                        {activeLine.text}
                      </span>
                    );
                  }
                })()
              ) : (
                <span style={{ color: 'var(--lyric-inactive-color)' }}>♪</span>
              )}
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

  // ── Render absolute floating popover or Bottom Sheet ──
  if (layoutType === 'popover' || (isMobile && isLyricsOpen)) {
    // If it's Dark/Manga theme AND on Mobile, we force it to Bottom Sheet
    // even if SongCard asked for 'inline'.
    const showAsBottomSheet = isMobile || isTablet;

    if (!showAsBottomSheet) {
      if (resolvedTheme !== 'light') return null;
      // Desktop Popover (Light Theme Only)
      return (
        <div 
          className="light-lyrics-card-popover absolute bg-white p-4 z-50 rounded-lg flex flex-col"
          style={{
            top: '100%',
            right: '16px',
            width: '345px',
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

    // MOBILE / TABLET BOTTOM SHEET
    return (
      <AnimatePresence>
        {isLyricsOpen && (
          <motion.div
            key="lyrics-sheet"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 100) {
                document.dispatchEvent(new CustomEvent('close-mobile-lyrics'));
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="lyrics-bottom-sheet fixed inset-x-0 bottom-0 z-[8000] flex flex-col"
            style={{
              height: '85vh',
              background: 'var(--bg-glass-strong, rgba(15,15,20,0.95))',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderRadius: '24px 24px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -10px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ width: 40, height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 2.5, margin: '14px auto 10px', flexShrink: 0 }} />
            
            <div className="flex flex-col flex-1 overflow-hidden">
              <div 
                ref={mobileScrollContainerRef}
                className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
              >
                {!localLyrics || localLyrics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                    <div className="spinner !w-6 !h-6" />
                    <span className="text-xs font-mono uppercase tracking-widest">تحميل الكلمات...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 py-8">
                    {localLyrics.map((line, i) => {
                      const isActive = i === currentLineIndex;
                      const isHeader = isHeaderLineHelper(line.text);
                      const isArabic = /[\u0600-\u06FF]/.test(line.text);

                      if (isHeader) {
                        return (
                          <div 
                            key={`lyric-mob-${i}`}
                            className="flex justify-center my-6"
                          >
                            <span className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/40 border border-white/5">
                              {line.text.replace(/\[|\]/g, '')}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`lyric-mob-${i}`}
                          id={`light-lyric-line-mobile-${i}`}
                          onClick={() => onSeek?.(line.time)}
                          className={`
                            relative py-3 transition-all duration-300 transform
                            ${isActive ? 'scale-105 opacity-100' : 'opacity-30 hover:opacity-50'}
                          `}
                          style={{
                            textAlign: isArabic ? 'right' : 'left',
                            direction: isArabic ? 'rtl' : 'ltr'
                          }}
                        >
                          <p style={{
                            fontFamily: isArabic ? 'var(--font-manga, sans-serif)' : 'var(--font-sans, sans-serif)',
                            fontSize: 'clamp(1.4rem, 6vw, 2.2rem)',
                            fontWeight: isActive ? 800 : 700,
                            lineHeight: 1.3,
                            color: isActive ? 'var(--text-primary, white)' : 'white',
                            textShadow: isActive ? '0 0 30px rgba(255,255,255,0.3)' : 'none',
                          }}>
                            {line.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
};
