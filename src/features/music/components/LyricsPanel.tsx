import { useEffect, useRef, useState } from 'react';
import { Music, AlertCircle } from 'lucide-react';
import { useNowPlaying } from '../hooks/useNowPlaying';

interface LrcLine {
  timeSec: number;
  text: string;
}

export function LyricsPanel() {
  const { currentTrack, currentTime, seek } = useNowPlaying();
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  // 1. Fetch and Parse LRC file
  useEffect(() => {
    if (!currentTrack || !currentTrack.lrcUrl) {
      setLyrics([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(currentTrack.lrcUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load lyrics file');
        }
        return res.text();
      })
      .then((text) => {
        const parsed = parseLrc(text);
        setLyrics(parsed);
      })
      .catch((err) => {
        console.warn('[LyricsPanel] LRC loading error:', err);
        setError('Lyrics unavailable or not formatted.');
        setLyrics([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentTrack]);

  // 2. Center-Scroll Active Line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;

      const containerHeight = container.clientHeight;
      const activeHeight = activeLine.clientHeight;
      const activeTop = activeLine.offsetTop;

      // Scroll so active lyrics line is centered vertically
      const targetScroll = activeTop - containerHeight / 2 + activeHeight / 2;
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [currentTime, lyrics]);

  // LRC file parsing engine
  function parseLrc(lrcText: string): LrcLine[] {
    const lines = lrcText.split('\n');
    const result: LrcLine[] = [];
    
    // Pattern to match [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
    const timePattern = /\[(\d{2}):(\d{2})(?:\.(\d{2,3})|:(\d{2}))?\]/g;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Check for meta headers like [ar: Artist]
      if (line.startsWith('[') && !line.match(/\[\d/)) {
        continue;
      }

      // Extract all timestamps from line (handles multiple timestamps per lyric)
      timePattern.lastIndex = 0;
      const matches: { min: number; sec: number; ms: number }[] = [];
      let match;

      while ((match = timePattern.exec(line)) !== null) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const msFraction = match[3] || match[4] || '0';
        let ms = parseInt(msFraction);
        if (msFraction.length === 2) ms *= 10; // normalize .34 to 340ms

        matches.push({ min, sec, ms });
      }

      // Extract the lyrics text
      const cleanText = line.replace(timePattern, '').trim();

      // Skip lines with no meaningful content
      if (matches.length > 0) {
        for (const m of matches) {
          const totalSec = m.min * 60 + m.sec + m.ms / 1000;
          result.push({ timeSec: totalSec, text: cleanText });
        }
      }
    }

    // Sort lyrics sequentially
    return result.sort((a, b) => a.timeSec - b.timeSec);
  }

  // Identify current active lyric line index
  const getActiveLineIndex = () => {
    if (lyrics.length === 0) return -1;
    let activeIndex = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].timeSec) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  };

  const activeIndex = getActiveLineIndex();

  if (!currentTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
        <Music size={32} className="opacity-40 animate-pulse" />
        <p className="text-sm">Select a song to display lyrics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase">Loading lyrics...</p>
      </div>
    );
  }

  if (error || lyrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
        <AlertCircle size={28} className="text-slate-600" />
        <div>
          <p className="text-sm font-semibold text-slate-400">Synced Lyrics Not Available</p>
          <p className="text-xs text-slate-600 mt-1">Enjoy the beautiful audio visualization instead!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-12 flex flex-col gap-6 scrollbar-hide select-none max-h-[450px]"
      style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%)' }}
    >
      {lyrics.map((line, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;

        return (
          <button
            key={i}
            ref={isActive ? activeLineRef : null}
            type="button"
            onClick={() => seek(line.timeSec)}
            className={`text-left font-sans font-extrabold text-lg md:text-xl transition-all duration-300 py-2 outline-none border-none bg-transparent cursor-pointer ${
              isActive
                ? 'text-teal-400 scale-[1.05] drop-shadow-[0_2px_12px_rgba(45,212,191,0.25)]'
                : isPast
                ? 'text-slate-400/80 hover:text-white'
                : 'text-slate-600 hover:text-slate-300'
            }`}
          >
            {line.text || '• • •'}
          </button>
        );
      })}
    </div>
  );
}
export default LyricsPanel;
