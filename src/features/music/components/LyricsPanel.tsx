import { useEffect, useState } from 'react';
import { useNowPlaying } from '../hooks/useNowPlaying';
import { fetchLyrics, getCachedLyrics, LyricsResult } from '../data/lyrics';

export function LyricsPanel() {
  const { currentTrack, currentTime, seek } = useNowPlaying();
  const [data, setData] = useState<LyricsResult | null>(() => currentTrack ? (getCachedLyrics(currentTrack.id) ?? null) : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!currentTrack) { setData(null); return; }
    
    const cached = getCachedLyrics(currentTrack.id);
    if (cached !== undefined) {
      setData(cached);
      return;
    }

    setLoading(true);
    fetchLyrics(currentTrack)
      .then((res) => { if (alive) setData(res); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [currentTrack]);

  const lines = data?.lines ?? [];
  const synced = Boolean(data?.synced) && lines.length > 0;

  if (loading) {
    // No “fetching” text: keep the (dimmed) cover visible until lyrics arrive.
    return null;
  }
  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/60 text-sm px-6 text-center">
        No lyrics available for this song
      </div>
    );
  }

  // السطر النشط
  let active = 0;
  if (synced) {
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].t) active = i; else break;
    }
  }

  // وضع غير متزامن: عرض بسيط مركّز
  if (!synced) {
    return (
      <div className="h-full overflow-y-auto px-6 py-8 text-center space-y-2">
        {lines.map((l, i) => (
          <p key={i} className="text-base text-white/70 leading-relaxed">{l.text}</p>
        ))}
      </div>
    );
  }

  // وضع متزامن: 3 أسطر فقط (سابق / منطوق / تالي)
  const prev = active > 0 ? lines[active - 1] : null;
  const cur = lines[active];
  const next = active < lines.length - 1 ? lines[active + 1] : null;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-3 text-center select-none">
      <p className="text-sm text-white/40 leading-snug line-clamp-2 min-h-[1.2em]">
        {prev ? prev.text : ''}
      </p>
      <p
        onClick={() => seek(cur.t)}
        className="text-lg font-bold text-white leading-snug cursor-pointer"
      >
        {cur.text}
      </p>
      <p className="text-sm text-white/40 leading-snug line-clamp-2 min-h-[1.2em]">
        {next ? next.text : ''}
      </p>
    </div>
  );
}
