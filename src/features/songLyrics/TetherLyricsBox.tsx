import { memo, useCallback, useMemo, useRef } from 'react';
import { useSongLyrics } from '../../hooks/useSongLyrics';
import { normalizeLyrics } from './normalizeLyrics';
import { useLyricEngine } from './useLyricEngine';
import { LyricsLine } from './LyricsLine';
import type { Song } from '../../types';
import '../../styles/components/song-lyrics-tether.css';

interface Props {
  song: Song;
  getCurrentTime: () => number;
  onSeek: (t: number) => void;
}

export const TetherLyricsBox = memo(({ song, getCurrentTime, onSeek }: Props) => {
  const { lyrics, isLoading } = useSongLyrics({ song, enableSelfFetch: true });
  const { lines, mode, hasTranslations } = useMemo(
    () => normalizeLyrics(lyrics),
    [lyrics],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const lineElsRef = useRef<Array<HTMLElement | null>>([]);

  const register = useCallback((i: number, el: HTMLElement | null) => {
    lineElsRef.current[i] = el;
  }, []);

  useLyricEngine({
    lines,
    getCurrentTime,
    containerRef,
    lineElsRef,
    enabled: lines.length > 0,
  });

  if (isLoading && lines.length === 0) {
    return <div className="nl-lyr-box nl-lyr-empty" aria-busy="true">{'\u266a'}</div>;
  }
  if (lines.length === 0) {
    return <div className="nl-lyr-box nl-lyr-empty">LYRICS NOT AVAILABLE</div>;
  }

  const cls = `nl-lyr-box nl-lyr-${mode}${hasTranslations ? ' has-tr' : ''} no-scrollbar`;
  return (
    <div ref={containerRef} className={cls} role="region" aria-label={`Lyrics: ${song.title}`}>
      <div className="nl-lyr-inner">
        {lines.map((line, i) => (
          <LyricsLine key={i} line={line} index={i} register={register} onSeek={onSeek} />
        ))}
      </div>
    </div>
  );
});
TetherLyricsBox.displayName = 'TetherLyricsBox';
