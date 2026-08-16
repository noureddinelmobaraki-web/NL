import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../engine/types';
import { audioEngine } from '../engine/audioEngine';
import { EQ_PRESETS } from '../engine/eqPresets';
import { getFvTracksSync, loadFvTracks, buildInitialOrder } from '../data/loadSongs';
import { saveTrackOffline, removeTrackOffline } from '../data/offline';
import { logPlay } from '../data/playTracking';

let sleepTimerInterval: any = null;

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface MusicState {
  tracks: Track[];
  displayOrder: string[]; // Random presentation order of all track IDs
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  hydrateTracks: () => Promise<void>;
    
  currentId?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;

  // Audio adjustments
  volume: number;
  muted: boolean;
  rate: number;
  pan: number;

  // Queue and modes
  queue: string[]; // List of Track IDs
  queueIndex: number;
  shuffleQueue: string[]; // Shuffle order if active
  repeat: 'off' | 'all' | 'one';
  shuffle: boolean;
  crossfadeSec: number;

  // EQ adjustments
  eqGains: number[];
  eqPreset: string;
  eqBypass: boolean;

  // Playlists & Favorites
  playlists: Playlist[];
  favorites: string[]; // List of track IDs
  history: string[]; // Recently played track IDs
  playCounts: Record<string, number>; // trackId -> play count
  downloaded: string[]; // Track IDs saved for offline playback

  // A-B Loop & Sleep Timer
  loopStart: number | null;
  loopEnd: number | null;
  sleepTimer: number | null; // remaining seconds

  // Setters/Actions
      
  
      
      actions: {
    setTracks: (tracks: Track[]) => void;
    setStatus: (status: 'idle' | 'loading' | 'ready' | 'error', error?: string) => void;
    playTrack: (id: string, startAutoplay?: boolean) => Promise<void>;
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    seek: (sec: number) => void;
    setVolume: (v: number) => void;
    setMuted: (m: boolean) => void;
    setRate: (r: number) => void;
    setPan: (p: number) => void;
    setEqGain: (index: number, db: number) => void;
    setEqPreset: (name: string) => void;
    setEqBypass: (b: boolean) => void;
    setRepeat: (mode: 'off' | 'all' | 'one') => void;
    toggleShuffle: () => void;
    setCrossfadeSec: (sec: number) => void;

    // Queue actions
    addToQueue: (trackId: string) => void;
    removeFromQueue: (trackId: string) => void;
    clearQueue: () => void;
    setQueue: (trackIds: string[], index?: number) => void;
    reorderQueue: (newOrder: string[]) => void;

    // Playlists & Favorites actions
    toggleFavorite: (trackId: string) => void;
    createPlaylist: (name: string) => string;
    deletePlaylist: (playlistId: string) => void;
    addToPlaylist: (playlistId: string, trackId: string) => void;
    addManyToPlaylist: (playlistId: string, trackIds: string[]) => void;
    addTracksToNewPlaylist: (name: string, trackIds: string[]) => void;
    renamePlaylist: (playlistId: string, name: string) => void;
    removeFromPlaylist: (playlistId: string, trackId: string) => void;
    addPlayedHistory: (trackId: string) => void;

    // Offline library actions
    saveOffline: (track: Track) => Promise<void>;
    saveManyOffline: (tracks: Track[]) => Promise<void>;
    removeOffline: (track: Track) => Promise<void>;
    setDownloaded: (ids: string[]) => void;

    // A-B Loop & Sleep Timer actions
    setLoopStart: (sec: number | null) => void;
    setLoopEnd: (sec: number | null) => void;
    setSleepTimer: (minutes: number | null) => void;

    // Sync Engine callbacks to Store
    updatePlaybackProgress: (currentTime: number, duration: number, buffered: number) => void;
    setPlaying: (isPlaying: boolean) => void;
    handlePlaybackEnded: () => void;
    setCurrentTrackId: (id: string) => void;
  };
}

const DEFAULT_EQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: getFvTracksSync(),
      displayOrder: [],
      status: 'loading',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,

      // Initial settings (will be loaded from localStorage)
      volume: 0.8,
      muted: false,
      rate: 1.0,
      pan: 0,

      queue: [],
      queueIndex: -1,
      shuffleQueue: [],
      repeat: 'off',
      shuffle: false,
      crossfadeSec: 3,

      eqGains: DEFAULT_EQ,
      eqPreset: 'Flat',
      eqBypass: false,

      playlists: [],
      favorites: [],
      history: [],
      playCounts: {},
      downloaded: [],

      // A-B Loop & Sleep Timer
      loopStart: null,
      loopEnd: null,
      sleepTimer: null,

      

      hydrateTracks: async () => {
        if (get().status === "ready") return;
        try {
          const tracks = await loadFvTracks();
          const valid = new Set(tracks.map((t) => t.id));
          const prev = get();
          set({
            tracks,
            displayOrder: buildInitialOrder(tracks),
            queue: (prev.queue ?? []).filter((id) => valid.has(id)),
            currentId:
              prev.currentId && valid.has(prev.currentId) ? prev.currentId : undefined,
            status: "ready",
          });
        } catch (e) {
          set({ status: "error", error: (e as Error).message });
        }
      },

      actions: {
        setTracks: (tracks) => set((s) => {
          const ids = tracks.map(t => t.id);
          const order = [...ids];
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          return { ...s, tracks, displayOrder: order, status: 'ready' };
        }),
        setStatus: (status, error) => set({ status, error }),

        playTrack: async (id, startAutoplay = true) => {
          const { tracks, queue, shuffle, actions } = get();
          const track = tracks.find((t) => t.id === id);
          if (!track) return;

          // ✅ إصلاح جذري: ابنِ الطابور من كل الأغاني إذا لم يكن كاملاً
          let workingQueue = queue;
          let index = queue.indexOf(id);
          let nextShuffleQueue = get().shuffleQueue;

          if (queue.length <= 1 || index === -1) {
            workingQueue = tracks.map((t) => t.id);
            index = workingQueue.indexOf(id);

            if (shuffle) {
              nextShuffleQueue = [...workingQueue];
              for (let i = nextShuffleQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nextShuffleQueue[i], nextShuffleQueue[j]] = [nextShuffleQueue[j], nextShuffleQueue[i]];
              }
              const curIdx = nextShuffleQueue.indexOf(id);
              if (curIdx !== -1) { nextShuffleQueue.splice(curIdx, 1); nextShuffleQueue.unshift(id); }
            }
            set({ currentId: id, queue: workingQueue, queueIndex: index, shuffleQueue: nextShuffleQueue });
          } else {
            set({ currentId: id, queueIndex: index });
          }

          actions.addPlayedHistory(id);

          // NL: تسجيل النقرة/الفتح لترتيب Top (fire-and-forget — لا يؤثر على التشغيل)
          logPlay({ item_type: 'song', item_id: track.id, title: track.title, seconds: Math.round(track.durationSec || 0) });

          try {
            await audioEngine.load(track, { autoplay: startAutoplay });
            const nextTrackId = getNextTrackId(workingQueue, index, shuffle, nextShuffleQueue);
            if (nextTrackId) {
              const nextTrack = tracks.find((t) => t.id === nextTrackId);
              if (nextTrack) audioEngine.preloadNext(nextTrack);
            }
          } catch (error) {
            console.error('[Store] playTrack failed', error);
          }
        },

        togglePlay: () => {
          const { currentId, tracks } = get();
          if (!currentId && tracks.length > 0) {
            // If nothing is playing, play the first song in the list
            get().actions.playTrack(tracks[0].id, true);
          } else {
            audioEngine.toggle();
          }
        },

        next: () => {
          const { queue, queueIndex, shuffle, shuffleQueue, actions } = get();
          if (queue.length === 0) return;

          let nextIdx = queueIndex + 1;
          const activeQueue = shuffle ? shuffleQueue : queue;

          if (nextIdx >= activeQueue.length) {
            if (get().repeat === 'all') {
              nextIdx = 0;
            } else {
              return; // Stop at end of queue
            }
          }

          const targetId = activeQueue[nextIdx];
          const actualIndexInMainQueue = queue.indexOf(targetId);

          set({ queueIndex: actualIndexInMainQueue, currentId: targetId });
          actions.playTrack(targetId, true);
        },

        prev: () => {
          const { queue, queueIndex, shuffle, shuffleQueue, actions } = get();
          if (queue.length === 0) return;

          // If we are more than 3 seconds in, restart the song
          const activeAudio = audioEngine.getActiveAudio();
          if (activeAudio && activeAudio.currentTime > 3) {
            audioEngine.seek(0);
            return;
          }

          let prevIdx = queueIndex - 1;
          const activeQueue = shuffle ? shuffleQueue : queue;

          if (prevIdx < 0) {
            if (get().repeat === 'all') {
              prevIdx = activeQueue.length - 1;
            } else {
              return; // Stay on first song
            }
          }

          const targetId = activeQueue[prevIdx];
          const actualIndexInMainQueue = queue.indexOf(targetId);

          set({ queueIndex: actualIndexInMainQueue, currentId: targetId });
          actions.playTrack(targetId, true);
        },

        seek: (sec) => {
          audioEngine.seek(sec);
        },

        setVolume: (v) => {
          set({ volume: v });
          audioEngine.setVolume(v);
        },

        setMuted: (m) => {
          set({ muted: m });
          audioEngine.setMuted(m);
        },

        setRate: (r) => {
          set({ rate: r });
          audioEngine.setRate(r);
        },

        setPan: (p) => {
          set({ pan: p });
          audioEngine.setPan(p);
        },

        setEqGain: (index, db) => {
          const gains = [...get().eqGains];
          gains[index] = db;
          set({ eqGains: gains, eqPreset: 'Custom' });
          audioEngine.setEqGain(index, db);
        },

        setEqPreset: (name) => {
          set({ eqPreset: name });
          audioEngine.setEqPreset(name);
          // Sync gains array from active preset
          const presetGains = requireEqPresetGains(name);
          if (presetGains) {
            set({ eqGains: presetGains });
          }
        },

        setEqBypass: (b) => {
          set({ eqBypass: b });
          audioEngine.setEqBypass(b);
        },

        setRepeat: (mode) => set({ repeat: mode }),

        toggleShuffle: () => {
          const { shuffle, queue, currentId } = get();
          const nextShuffle = !shuffle;
          let shuffleQueue: string[] = [];

          if (nextShuffle) {
            // Generate shuffled list of track IDs
            shuffleQueue = [...queue];
            // Simple Fisher-Yates shuffle
            for (let i = shuffleQueue.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
            }

            // Bring currently playing song to the front of shuffle queue
            if (currentId) {
              const currentIdx = shuffleQueue.indexOf(currentId);
              if (currentIdx !== -1) {
                shuffleQueue.splice(currentIdx, 1);
                shuffleQueue.unshift(currentId);
              }
            }
          }

          set({ shuffle: nextShuffle, shuffleQueue });
        },

        setCrossfadeSec: (sec) => {
          set({ crossfadeSec: sec });
          audioEngine.setCrossfadeSec(sec);
        },

        addToQueue: (trackId) => {
          const { queue, shuffleQueue, shuffle } = get();
          if (queue.includes(trackId)) return;
          const nextQueue = [...queue, trackId];
          const nextShuffleQueue = shuffle ? [...shuffleQueue, trackId] : [];
          set({ queue: nextQueue, shuffleQueue: nextShuffleQueue });
        },

        removeFromQueue: (trackId) => {
          const { queue, shuffleQueue, currentId } = get();
          const nextQueue = queue.filter((id) => id !== trackId);
          const nextShuffleQueue = shuffleQueue.filter((id) => id !== trackId);

          const nextIdx = nextQueue.indexOf(currentId || '');
          set({
            queue: nextQueue,
            shuffleQueue: nextShuffleQueue,
            queueIndex: nextIdx
          });
        },

        clearQueue: () => {
          set({ queue: [], shuffleQueue: [], queueIndex: -1, currentId: undefined });
          audioEngine.pause();
        },

        setQueue: (trackIds, index = 0) => {
          const { shuffle } = get();
          let shuffleQueue: string[] = [];

          if (shuffle) {
            shuffleQueue = [...trackIds];
            for (let i = shuffleQueue.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
            }
            if (trackIds[index]) {
              const targetId = trackIds[index];
              const curIdx = shuffleQueue.indexOf(targetId);
              if (curIdx !== -1) {
                shuffleQueue.splice(curIdx, 1);
                shuffleQueue.unshift(targetId);
              }
            }
          }

          set({
            queue: trackIds,
            queueIndex: index,
            shuffleQueue,
            currentId: trackIds[index]
          });
        },

        reorderQueue: (newOrder) => {
          const { currentId } = get();
          const index = newOrder.indexOf(currentId || '');
          set({ queue: newOrder, queueIndex: index });
        },

        toggleFavorite: (trackId) => {
          const { favorites } = get();
          const isFav = favorites.includes(trackId);
          const nextFavs = isFav
            ? favorites.filter((id) => id !== trackId)
            : [...favorites, trackId];
          set({ favorites: nextFavs });
        },

        createPlaylist: (name) => {
          const { playlists } = get();
          const id = `pl-${Date.now()}`;
          set({
            playlists: [...playlists, { id, name, trackIds: [], createdAt: Date.now() }]
          });
          return id;
        },

        deletePlaylist: (playlistId) => {
          const { playlists } = get();
          set({ playlists: playlists.filter((pl) => pl.id !== playlistId) });
        },

        addToPlaylist: (playlistId, trackId) => {
          const { playlists } = get();
          set({
            playlists: playlists.map((pl) => {
              if (pl.id !== playlistId) return pl;
              if (pl.trackIds.includes(trackId)) return pl;
              return { ...pl, trackIds: [...pl.trackIds, trackId] };
            })
          });
        },

        addManyToPlaylist: (playlistId, trackIds) => {
          const { playlists } = get();
          set({
            playlists: playlists.map((pl) => {
              if (pl.id !== playlistId) return pl;
              const merged = [...pl.trackIds];
              for (const id of trackIds) if (!merged.includes(id)) merged.push(id);
              return { ...pl, trackIds: merged };
            }),
          });
        },

        addTracksToNewPlaylist: (name, trackIds) => {
          const id = `pl-${Date.now()}`;
          const unique = Array.from(new Set(trackIds));
          set({
            playlists: [...get().playlists, { id, name, trackIds: unique, createdAt: Date.now() }],
          });
        },

        renamePlaylist: (playlistId, name) => {
          set({
            playlists: get().playlists.map((pl) => (pl.id === playlistId ? { ...pl, name } : pl)),
          });
        },

        removeFromPlaylist: (playlistId, trackId) => {
          const { playlists } = get();
          set({
            playlists: playlists.map((pl) => {
              if (pl.id !== playlistId) return pl;
              return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
            })
          });
        },

        addPlayedHistory: (trackId) => {
          const { history, playCounts } = get();
          // Filter out existing and unshift to bring to top of history list (limit to 50)
          const nextHistory = [trackId, ...history.filter((id) => id !== trackId)].slice(0, 50);
          const nextCounts = { ...playCounts, [trackId]: (playCounts[trackId] || 0) + 1 };
          set({ history: nextHistory, playCounts: nextCounts });
        },

        saveOffline: async (track) => {
          if (get().downloaded.includes(track.id)) return;
          const ok = await saveTrackOffline(track);
          if (ok && !get().downloaded.includes(track.id)) {
            set({ downloaded: [...get().downloaded, track.id] });
          }
        },

        saveManyOffline: async (tracks) => {
          for (const t of tracks) {
            // Sequential on purpose: avoids hammering the CDN and keeps memory low.
            await get().actions.saveOffline(t);
          }
        },

        removeOffline: async (track) => {
          await removeTrackOffline(track);
          set({ downloaded: get().downloaded.filter((id) => id !== track.id) });
        },

        setDownloaded: (ids) => set({ downloaded: ids }),

        setLoopStart: (sec) => {
          set({ loopStart: sec });
          audioEngine.setLoop(sec, get().loopEnd);
        },
        setLoopEnd: (sec) => {
          set({ loopEnd: sec });
          audioEngine.setLoop(get().loopStart, sec);
        },
        setSleepTimer: (minutes) => {
          if (minutes === null) {
            set({ sleepTimer: null });
            if (sleepTimerInterval) {
              clearInterval(sleepTimerInterval);
              sleepTimerInterval = null;
            }
          } else {
            const seconds = minutes * 60;
            set({ sleepTimer: seconds });
            if (sleepTimerInterval) clearInterval(sleepTimerInterval);
            sleepTimerInterval = setInterval(() => {
              const currentSec = useMusicStore.getState().sleepTimer;
              if (currentSec !== null && currentSec > 0) {
                const nextSec = currentSec - 1;
                set({ sleepTimer: nextSec });
                if (nextSec === 0) {
                  get().actions.togglePlay(); // Pause playback
                  get().actions.setSleepTimer(null); // Clear timer
                }
              }
            }, 1000) as any;
          }
        },

        updatePlaybackProgress: (currentTime, duration, buffered) => {
          set({ currentTime, duration, buffered });
        },

        setPlaying: (isPlaying) => {
          set({ isPlaying });
        },

        handlePlaybackEnded: () => {
          const { repeat, actions } = get();
          if (repeat === 'one') {
            audioEngine.seek(0);
            audioEngine.play().catch(() => {});
          } else {
            actions.next();
          }
        },

        setCurrentTrackId: (id) => {
          const { queue } = get();
          const idx = queue.indexOf(id);
          set({ currentId: id, queueIndex: idx !== -1 ? idx : 0 });
          get().actions.addPlayedHistory(id);
        }
      }
    }),
    {
      name: 'nl-music-store-v1',
      // partialize allows saving only persistent user preferences to storage
      partialize: (state) => ({
        currentId: state.currentId,
        volume: state.volume,
        muted: state.muted,
        rate: state.rate,
        pan: state.pan,
        repeat: state.repeat,
        shuffle: state.shuffle,
        crossfadeSec: state.crossfadeSec,
        eqGains: state.eqGains,
        eqPreset: state.eqPreset,
        eqBypass: state.eqBypass,
        playlists: state.playlists,
        favorites: state.favorites,
        history: state.history,
        playCounts: state.playCounts,
        downloaded: state.downloaded,
        queue: state.queue,
        queueIndex: state.queueIndex
      })
    }
  )
);

// Helpers
function getNextTrackId(queue: string[], index: number, shuffle: boolean, shuffleQueue: string[]): string | null {
  const activeQueue = shuffle ? shuffleQueue : queue;
  if (activeQueue.length === 0) return null;
  const nextIdx = index + 1;
  if (nextIdx >= activeQueue.length) return null;
  return activeQueue[nextIdx];
}

function requireEqPresetGains(name: string): number[] | null {
  return EQ_PRESETS[name] || null;
}
