import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMusicStore } from '../store/musicStore';
import { selectDisplayTracks } from '../store/selectors';
import { useVirtualRows } from '../hooks/useVirtualRows';
import { useEndlessDeck } from '../hooks/useEndlessDeck';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { SongRow } from './SongRow';
import { PlaylistsPanel } from './PlaylistsPanel';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Track } from '../engine/types';
import { prefetchTracks } from '../data/audioPrefetch';
import styles from '../music.module.css';
import { Search, X, CheckSquare, ListPlus, DownloadCloud, Lightbulb } from 'lucide-react';
import {SuggestSongModal} from './SuggestSongModal';
import {useTopSongs} from '../hooks/useTopSongs';

const ROW_HEIGHT = 64;
type Tab = 'all' | 'top' | 'favorites' | 'downloaded' | 'playlists';

function formatTime(sec?: number): string {
  if (!sec || !isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

export function SongList({ onOpenPlayer }: { onOpenPlayer?: () => void }) {
  const tracks = useMusicStore(useShallow(selectDisplayTracks));
  const favorites = useMusicStore(useShallow((s) => s.favorites));
  const downloaded = useMusicStore(useShallow((s) => s.downloaded));
  const currentId = useMusicStore((s) => s.currentId);
  const actions = useMusicStore((s) => s.actions);
  const online = useOnlineStatus();
  const topIds = useTopSongs(50);

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const dlSet = useMemo(() => new Set(downloaded), [downloaded]);

  // When offline, only downloaded songs exist -> force a safe tab.
  useEffect(() => {
    if (!online && tab !== 'downloaded' && tab !== 'playlists') setTab('downloaded');
  }, [online, tab]);

  const tabsToShow: Tab[] = online
    ? ['all', 'top', 'favorites', 'downloaded', 'playlists']
    : ['downloaded', 'playlists'];

  const exitSelect = useCallback(() => { setSelectMode(false); setSelected(new Set()); }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Base list per tab (before search).
  const baseList = useMemo<Track[]>(() => {
    if (tab === 'favorites') return tracks.filter((t) => favSet.has(t.id));
    if (tab === 'downloaded') return tracks.filter((t) => dlSet.has(t.id));
    if (tab === 'top') {
      const map = new Map(tracks.map((t) => [t.id, t] as const));
      return topIds.map((id) => map.get(id)).filter((t): t is Track => !!t);
    }
    return tracks; // 'all'
  }, [tracks, tab, favSet, dlSet, topIds]);

  const filtered = useMemo(() => {
    let list = baseList;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [baseList, query]);

  // Endless shuffle only for the full online catalog, never while selecting.
  const isEndless = online && tab === 'all' && !query.trim() && !selectMode && tracks.length > 0;
  const deck = useEndlessDeck(tracks.length, 7);

  const rowCount = isEndless ? deck.count : filtered.length;
  const { virtualItems, totalHeight, endIndex } = useVirtualRows({
    count: rowCount,
    rowHeight: ROW_HEIGHT,
    overscan: 8,
    scrollElRef: scrollRef,
  });

  useEffect(() => {
    if (isEndless) deck.ensureIndex(endIndex);
  }, [isEndless, deck, endIndex]);

  useEffect(() => { prefetchTracks(tracks, 6); }, [tracks]);

  const rowAt = useCallback((virtualIndex: number): Track | undefined => {
    if (isEndless) return tracks[deck.resolve(virtualIndex)];
    return filtered[virtualIndex];
  }, [isEndless, tracks, deck, filtered]);

  const handleRow = useCallback((virtualIndex: number) => {
    const song = rowAt(virtualIndex);
    if (!song) return;
    if (selectMode) { toggleSelect(song.id); return; }
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
  }, [rowAt, selectMode, toggleSelect, isEndless, deck, tracks, filtered, actions, onOpenPlayer]);

  const listBoxStyle = useMemo(() => ({ height: totalHeight, position: 'relative' as const }), [totalHeight]);
  const selectedTracks = useMemo(() => tracks.filter((t) => selected.has(t.id)), [tracks, selected]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 px-1 pb-2 overflow-x-auto scrollbar-hide">
        {tabsToShow.map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'playlists') exitSelect(); }}
            className={
              'rounded-full font-bold whitespace-nowrap transition-all duration-300 ease-out transform origin-center ' +
              (tab === t
                ? 'bg-[#FF7A1A] text-white shadow-md scale-100 px-4 py-1.5 text-xs sm:text-sm font-extrabold ring-2 ring-[#FF7A1A]/20'
                : 'bg-white/50 text-slate-700 hover:bg-white/80 border border-white/60 shadow-sm scale-90 px-2.5 py-1 text-[11px] sm:text-xs opacity-70 hover:opacity-100 hover:scale-95')
            }
          >
            {t === 'all' ? 'All'
              : t === 'top' ? 'Top'
              : t === 'favorites' ? 'Favorites'
              : t === 'downloaded' ? 'Downloaded' : 'Playlists'}
          </button>
        ))}
        {!online && <span className="ml-auto text-xs font-bold text-[#00B894] whitespace-nowrap px-2">Offline</span>}
      </div>

      {tab === 'playlists' ? (
        <PlaylistsPanel onOpenPlayer={onOpenPlayer} online={online} />
      ) : (
        <>
          {/* Search + select toggle */}
          <div className="flex items-center gap-2 px-1 pb-2">
            <div className="relative flex-1">
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
            {online && (
              <button
                onClick={() => setSuggestOpen(true)}
                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-2xl border bg-white/60 text-slate-800 border-white/60 hover:bg-white/80 transition-colors text-sm font-bold"
                title="اقترح أغنية"
              >
                <Lightbulb size={16} className="text-[#FF7A1A]" />
                <span className="hidden xs:inline">اقترح أغنية</span>
              </button>
            )}
            <button
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className={
                'shrink-0 p-2 rounded-2xl border transition-colors ' +
                (selectMode ? 'bg-[#FF7A1A] text-white border-transparent' : 'bg-white/60 text-slate-800 border-white/60 hover:bg-white/80')
              }
              title={selectMode ? 'Cancel selection' : 'Select multiple'}
            >
              <CheckSquare size={18} />
            </button>
          </div>

          {/* Virtualized list */}
          <div ref={scrollRef} className={'flex-1 min-h-0 overflow-y-auto ' + styles.scrollArea}>
            {!isEndless && filtered.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 px-6 text-center">
                {tab === 'downloaded'
                  ? 'No downloaded songs yet. Tap the download icon on a song to save it for offline.'
                  : 'No songs found.'}
              </div>
            ) : (
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
                      onPlay={() => handleRow(vi.index)}
                      onToggleFav={() => actions.toggleFavorite(song.id)}
                      formatTime={formatTime}
                      selectable={selectMode}
                      selected={selected.has(song.id)}
                      onToggleSelect={() => toggleSelect(song.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection action bar */}
          {selectMode && selected.size > 0 && (
            <div className="shrink-0 flex items-center gap-2 p-2 mt-1 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 shadow-lg">
              <span className="text-sm font-bold text-slate-800 px-2">{selected.size} selected</span>
              <button
                onClick={() => setShowAdd(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF7A1A] text-white text-sm font-bold hover:brightness-105"
              >
                <ListPlus size={16} /> Add to playlist
              </button>
              {online && (
                <button
                  onClick={() => actions.saveManyOffline(selectedTracks)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00E676] text-slate-900 text-sm font-bold hover:brightness-105"
                  title="Save all selected offline"
                >
                  <DownloadCloud size={16} /> Save offline
                </button>
              )}
            </div>
          )}
        </>
      )}

      <AddToPlaylistModal
        open={showAdd}
        trackIds={Array.from(selected)}
        onClose={() => setShowAdd(false)}
        onDone={() => { setShowAdd(false); exitSelect(); }}
      />
      <SuggestSongModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
      />
    </div>
  );
}
