import { useState, useEffect, useMemo } from 'react';
import { LyricLine, Song } from '../../types';
import { parseLRC, LyricsWindowContent } from '../LyricsEngine';
import { loadSession, saveSession } from '../../utils/sessionState';

export interface LyricsDisplayProps {
  song: Song | null;
  currentTime: number;
  theme?: string;
  karaokeMode?: boolean;
  onSeek?: (time: number) => void;
}

type LyricsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lines: LyricLine[] }
  | { status: 'error' };

export const LyricsDisplay = ({
  song,
  currentTime,
  theme,
  karaokeMode = false,
  onSeek,
}: LyricsDisplayProps) => {
  const [lyricsState, setLyricsState] = useState<LyricsState>({ status: 'idle' });
  const lyrics = lyricsState.status === 'ready' ? lyricsState.lines : [];

  useEffect(() => {
    if (!song || !song.lrc) {
      setLyricsState({ status: 'idle' });
      return;
    }

    const session = loadSession();
    if (session.lrcCache[song.id]) {
      setLyricsState({ status: 'ready', lines: session.lrcCache[song.id] });
      return;
    }

    setLyricsState({ status: 'loading' });
    const controller = new AbortController();
    const filename = song.lrc.split('/').pop() || '';
    const encodedFilename = encodeURIComponent(filename);

    fetch(`${import.meta.env.BASE_URL}lrc/${encodedFilename}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.text();
      })
      .then((text) => {
        const parsed = parseLRC(text);
        setLyricsState({ status: 'ready', lines: parsed });
        saveSession({ lrcCache: { ...loadSession().lrcCache, [song.id]: parsed } });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('LRC fetch error inside LyricsDisplay:', err);
        setLyricsState({ status: 'error' });
      });

    return () => controller.abort();
  }, [song]);

  const activeLine = useMemo(() => {
    if (!lyrics.length) return null;
    // Binary search — lyrics are time-sorted by parseLRC
    let lo = 0;
    let hi = lyrics.length - 1;
    let result: LyricLine | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lyrics[mid].time <= currentTime) {
        result = lyrics[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  }, [lyrics, currentTime]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!song || !song.lrc) return null;

  if (karaokeMode) {
    return (
      <div
        style={{
          marginTop: '16px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid var(--card-border-line)',
          paddingTop: '12px',
        }}
      >
        <p
          style={{
            fontFamily: theme === 'light' ? 'Geneva, sans-serif' : 'var(--font-manga)',
            fontSize: 'clamp(1.2rem, 4vw, 2rem)',
            textAlign: 'center',
            letterSpacing: '0.05em',
            lineHeight: 1.4,
            padding: '0 16px',
          }}
        >
          {activeLine ? (
            activeLine.words && activeLine.words.length > 0 ? (
              activeLine.words.map((word, wordIndex) => {
                const isPlayed = word.time <= currentTime;
                const isCurrent = currentTime >= word.time && currentTime < (word.endTime ?? (word.time + 1));
                const wDuration = (word.endTime ?? (word.time + 1)) - word.time;
                const progress = Math.max(0, Math.min(100, ((currentTime - word.time) / (wDuration || 1)) * 100));
                
                const isArabic = /[\u0600-\u06FF]/.test(word.text);

                // MOBILE-LYRICS: smooth 200ms coloring + gradient sliding wiper overlay
                const style: React.CSSProperties = isMobile ? {
                  display: 'inline-block',
                  whiteSpace: 'pre' as const,
                  transition: 'color 200ms ease-out, opacity 200ms ease-out',
                  color: isCurrent ? 'transparent' : (isPlayed ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)'),
                  opacity: isPlayed ? 1 : 0.45,
                  textShadow: isPlayed && theme !== 'light' ? '0 0 20px var(--lyric-active-shadow)' : 'none',
                  backgroundImage: isCurrent
                    ? (isArabic
                      ? `linear-gradient(to left, var(--lyric-active-color) ${progress}%, var(--lyric-inactive-color) ${progress}%)`
                      : `linear-gradient(to right, var(--lyric-active-color) ${progress}%, var(--lyric-inactive-color) ${progress}%)`
                    )
                    : undefined,
                  WebkitBackgroundClip: isCurrent ? 'text' : undefined,
                  backgroundClip: isCurrent ? 'text' : undefined,
                  WebkitTextFillColor: isCurrent ? 'transparent' : undefined,
                } : {
                  color: isPlayed ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)',
                  opacity: isPlayed ? 1 : 0.45,
                  textShadow: isPlayed && theme !== 'light' ? '0 0 20px var(--lyric-active-shadow)' : 'none',
                  transition: 'all 0.15s ease-out',
                  display: 'inline-block',
                  whiteSpace: 'pre' as const,
                };

                return (
                  <span
                    key={wordIndex}
                    style={style}
                    dir={isArabic ? 'rtl' : 'ltr'}
                  >
                    {word.text}
                  </span>
                );
              })
            ) : (
              <span
                style={{
                  color: 'var(--lyric-active-color)',
                  textShadow: theme === 'light' ? 'none' : '0 0 20px var(--lyric-active-shadow)',
                }}
              >
                {activeLine.text}
              </span>
            )
          ) : (
            <span style={{ color: 'var(--lyric-inactive-color)' }}>
              {lyricsState.status === 'loading' ? '...' : '♪'}
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '16px',
        borderTop: '1px solid var(--card-border-line)',
        paddingTop: '12px',
        maxHeight: '220px',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="no-scrollbar"
    >
      <LyricsWindowContent
        currentTime={currentTime || 0}
        onSeek={onSeek || (() => {})}
        lyrics={lyrics}
        isMobilePlayer={true}
      />
    </div>
  );
};

export default LyricsDisplay;
