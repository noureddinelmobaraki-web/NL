/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '../engine/types';
import { getFvTracksSync, loadFvTracks, buildInitialOrder } from '../data/loadSongs';
import { DEFAULT_EQ, createEqActions } from './slices/eqSlice';
import { createQueueActions } from './slices/queueSlice';
import { createLibraryActions } from './slices/librarySlice';
import { createPlaybackActions } from './slices/playbackSlice';

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface MusicState {
  tracks: Track[];
  displayOrder: string[];
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
  queue: string[];
  queueIndex: number;
  shuffleQueue: string[];
  repeat: 'off' | 'all' | 'one';
  shuffle: boolean;
  crossfadeSec: number;

  // EQ adjustments
  eqGains: number[];
  eqPreset: string;
  eqBypass: boolean;

  // Playlists & Favorites
  playlists: Playlist[];
  favorites: string[];
  history: string[];
  playCounts: Record<string, number>;
  downloaded: string[];

  // A-B Loop & Sleep Timer
  loopStart: number | null;
  loopEnd: number | null;
  sleepTimer: number | null;

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

      loopStart: null,
      loopEnd: null,
      sleepTimer: null,

      hydrateTracks: async () => {
        if (get().status === 'ready') return;
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
            status: 'ready',
          });
        } catch (e) {
          set({ status: 'error', error: (e as Error).message });
        }
      },

      actions: {
        ...createPlaybackActions(set, get),
        ...createEqActions(set, get),
        ...createQueueActions(set, get),
        ...createLibraryActions(set, get),
      },
    }),
    {
      name: 'nl-music-store-v1',
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
        queueIndex: state.queueIndex,
      }),
    },
  ),
);
