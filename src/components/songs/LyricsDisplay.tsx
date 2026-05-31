import { useState, useEffect, useMemo } from 'react';
import { LyricLine } from '../../types';
import { parseLRC, LyricsWindowContent } from '../LyricsEngine';
import { loadSession, saveSession } from '../../utils/sessionState';

export interface LyricsDisplayProps {
  song: any;
  currentTime: number;
  theme?: string;
  karaokeMode?: boolean;
  onSeek?: (time: number) => void;
}

export const LyricsDisplay = ({
  song,
  currentTime,
  theme,
  karaokeMode = false,
  onSeek,
}: LyricsDisplayProps) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);

  useEffect(() => {
    if (!song || !song.lrc) {
      setLyrics([]);
      return;
    }

    const session = loadSession();
    if (session.lrcCache[song.id]) {
      setLyrics(session.lrcCache[song.id]);
      return;
    }

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
        setLyrics(parsed);
        saveSession({ lrcCache: { ...loadSession().lrcCache, [song.id]: parsed } });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('LRC fetch error inside LyricsDisplay:', err);
        }
      });

    return () => controller.abort();
  }, [song]);

  const activeLine = useMemo(() => {
    let line = null;
    for (const l of lyrics) {
      if (l.time <= currentTime) line = l;
      else break;
    }
    return line;
  }, [lyrics, currentTime]);

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
                return (
                  <span
                    key={wordIndex}
                    style={{
                      color: isPlayed ? 'var(--lyric-active-color)' : 'var(--lyric-inactive-color)',
                      opacity: isPlayed ? 1 : 0.45,
                      textShadow: isPlayed && theme !== 'light' ? '0 0 20px var(--lyric-active-shadow)' : 'none',
                      transition: 'all 0.15s ease-out',
                      display: 'inline-block',
                      whiteSpace: 'pre',
                    }}
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
            <span style={{ color: 'var(--lyric-inactive-color)' }}>♪</span>
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
