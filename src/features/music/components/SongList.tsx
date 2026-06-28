import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMusicStore } from '../store/musicStore';
import { selectDisplayTracks } from '../store/selectors';
import { useVirtualRows } from '../hooks/useVirtualRows';
import { useEndlessDeck } from '../hooks/useEndlessDeck';
import { SongRow } from './SongRow';
import { Track } from '../engine/types';
import styles from '../music.module.css';
import { Search, X } from 'lucide-react';

const ROW_HEIGHT = 64;
type Tab = 'all' | 'favorites';

function formatTime(sec?: number): string {
  if (!sec || !isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function SongList({ onOpenPlayer }: { onOpenPlayer?: () => void }) {
  const tracks = useMusicStore(useShallow(selectDisplayTracks));
  const favorites = useMusicStore(useShallow((s) => s.favorites));
  const currentId = useMusicStore((s) => s.currentId);
  const actions = useMusicStore((s) => s.actions);

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  // القائمة المعروضة حسب التبويب/البحث
  const filtered = useMemo(() => {
    let list: Track[] = tracks;
    if (tab === 'favorites') list = tracks.filter((t) => favSet.has(t.id));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, tab, favSet, query]);

  const isEndless = tab === 'all' && !query.trim() && tracks.length > 0;
  const deck = useEndlessDeck(tracks.length, 7);

  const rowCount = isEndless ? deck.count : filtered.length;
  const { virtualItems, totalHeight, endIndex } = useVirtualRows({
    count: rowCount,
    rowHeight: ROW_HEIGHT,
    overscan: 8,
    scrollElRef: scrollRef,
  });

  // وسّع الديك عند الاقتراب من الأسفل (لا نهاية)
  useEffect(() => {
    if (isEndless) deck.ensureIndex(endIndex);
  }, [isEndless, deck, endIndex]);

  const rowAt = useCallback((virtualIndex: number): Track | undefined => {
    if (isEndless) return tracks[deck.resolve(virtualIndex)];
    return filtered[virtualIndex];
  }, [isEndless, tracks, deck, filtered]);

  const handlePlay = useCallback((virtualIndex: number) => {
    const song = rowAt(virtualIndex);
    if (!song) return;
    if (isEndless) {
      const order = deck.cycleFrom(virtualIndex).map((realIdx) => tracks[realIdx].id);
      actions.setQueue(order, 0);
      actions.playTrack(song.id);
    } else {
      const order = filtered.map((t) => t.id);
      actions.setQueue(order, virtualIndex);
      actions.playTrack(song.id);
    }
    onOpenPlayer?.();
  }, [rowAt, isEndless, deck, tracks, filtered, actions, onOpenPlayer]);

  const listBoxStyle = useMemo(() => ({ height: totalHeight, position: 'relative' as const }), [totalHeight]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* التبويبات */}
      <div className="flex items-center gap-2 px-1 pb-2 overflow-x-auto scrollbar-hide">
        {(['all', 'favorites'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ' +
              (tab === t ? 'bg-[#FF7A1A] text-white shadow-sm' : 'bg-white/60 text-slate-800 hover:bg-white/80 border border-white/60 shadow-sm')
            }
          >
            {t === 'all' ? 'All' : 'Favorites'}
          </button>
        ))}
      </div>

      {/* بحث */}
      <div className="relative px-1 pb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or artist..."
          className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl pl-9 pr-9 py-2 text-sm text-slate-800 placeholder-slate-600 outline-none focus:border-[#FF7A1A] transition-all shadow-inner"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800">
            <X size={16} />
          </button>
        )}
      </div>

      {/* القائمة الافتراضية — بلا سكرول ظاهر */}
      <div ref={scrollRef} className={'flex-1 min-h-0 overflow-y-auto ' + styles.scrollArea}>
        <div style={listBoxStyle}>
          {virtualItems.map((vi) => {
            const song = rowAt(vi.index);
            if (!song) return null;
            return (
              <SongRow
                key={isEndless ? vi.index : song.id}
                song={song}
                isSelected={song.id === currentId}
                isFav={favSet.has(song.id)}
                rowHeight={ROW_HEIGHT}
                offsetTop={vi.offsetTop}
                onPlay={() => handlePlay(vi.index)}
                onToggleFav={() => actions.toggleFavorite(song.id)}
                formatTime={formatTime}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
