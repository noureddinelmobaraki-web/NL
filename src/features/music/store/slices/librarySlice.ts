/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { Track } from '../../engine/types';
import { saveTrackOffline, removeTrackOffline } from '../../data/offline';
import type { MusicState } from '../musicStore';

export function createLibraryActions(
  set: (partial: Partial<MusicState> | ((state: MusicState) => Partial<MusicState>)) => void,
  get: () => MusicState,
) {
  return {
    toggleFavorite: (trackId: string) => {
      const { favorites } = get();
      const isFav = favorites.includes(trackId);
      const nextFavs = isFav
        ? favorites.filter((id) => id !== trackId)
        : [...favorites, trackId];
      set({ favorites: nextFavs });
    },

    createPlaylist: (name: string) => {
      const { playlists } = get();
      const id = `pl-${Date.now()}`;
      set({
        playlists: [...playlists, { id, name, trackIds: [], createdAt: Date.now() }],
      });
      return id;
    },

    deletePlaylist: (playlistId: string) => {
      const { playlists } = get();
      set({ playlists: playlists.filter((pl) => pl.id !== playlistId) });
    },

    addToPlaylist: (playlistId: string, trackId: string) => {
      const { playlists } = get();
      set({
        playlists: playlists.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.trackIds.includes(trackId)) return pl;
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        }),
      });
    },

    addManyToPlaylist: (playlistId: string, trackIds: string[]) => {
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

    addTracksToNewPlaylist: (name: string, trackIds: string[]) => {
      const id = `pl-${Date.now()}`;
      const unique = Array.from(new Set(trackIds));
      set({
        playlists: [...get().playlists, { id, name, trackIds: unique, createdAt: Date.now() }],
      });
    },

    renamePlaylist: (playlistId: string, name: string) => {
      set({
        playlists: get().playlists.map((pl) => (pl.id === playlistId ? { ...pl, name } : pl)),
      });
    },

    removeFromPlaylist: (playlistId: string, trackId: string) => {
      const { playlists } = get();
      set({
        playlists: playlists.map((pl) => {
          if (pl.id !== playlistId) return pl;
          return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
        }),
      });
    },

    addPlayedHistory: (trackId: string) => {
      const { history, playCounts } = get();
      const nextHistory = [trackId, ...history.filter((id) => id !== trackId)].slice(0, 50);
      const nextCounts = { ...playCounts, [trackId]: (playCounts[trackId] || 0) + 1 };
      set({ history: nextHistory, playCounts: nextCounts });
    },

    saveOffline: async (track: Track) => {
      if (get().downloaded.includes(track.id)) return;
      const ok = await saveTrackOffline(track);
      if (ok && !get().downloaded.includes(track.id)) {
        set({ downloaded: [...get().downloaded, track.id] });
      }
    },

    saveManyOffline: async (tracks: Track[]) => {
      for (const t of tracks) {
        await get().actions.saveOffline(t);
      }
    },

    removeOffline: async (track: Track) => {
      await removeTrackOffline(track);
      set({ downloaded: get().downloaded.filter((id) => id !== track.id) });
    },

    setDownloaded: (ids: string[]) => set({ downloaded: ids }),
  };
}
