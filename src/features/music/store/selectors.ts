import { MusicState } from './musicStore';
import { Track } from '../engine/types';

/**
 * ⚠️ zustand v5: أي محدّد يُعيد مصفوفة/كائنًا جديدًا (مثل .map/.filter)
 * يجب استخدامه دائمًا عبر useMusicStore(useShallow(selector))
 * وإلا تحدث حلقة إعادة عرض لا نهائية (Maximum update depth exceeded).
 */
const trackMapCache = new WeakMap<Track[], Map<string, Track>>();
function getTrackMap(tracks: Track[]): Map<string, Track> {
  let map = trackMapCache.get(tracks);
  if (!map) {
    map = new Map();
    for (let i = 0; i < tracks.length; i++) {
      map.set(tracks[i].id, tracks[i]);
    }
    trackMapCache.set(tracks, map);
  }
  return map;
}

export const selectCurrentTrack = (state: MusicState): Track | undefined => {
  if (!state.currentId) return undefined;
  return getTrackMap(state.tracks).get(state.currentId);
};

export const selectFavoriteTracks = (state: MusicState): Track[] => {
  const map = getTrackMap(state.tracks);
  return state.favorites.map(id => map.get(id)).filter((t): t is Track => !!t);
};

export const selectHistoryTracks = (state: MusicState): Track[] => {
  const map = getTrackMap(state.tracks);
  return state.history
    .map((id) => map.get(id))
    .filter((t): t is Track => !!t);
};

export const selectQueueTracks = (state: MusicState): Track[] => {
  const map = getTrackMap(state.tracks);
  return state.queue
    .map((id) => map.get(id))
    .filter((t): t is Track => !!t);
};

export const selectPlaylistTracks = (playlistId: string) => (state: MusicState): Track[] => {
  const pl = state.playlists.find((p) => p.id === playlistId);
  if (!pl) return [];
  const map = getTrackMap(state.tracks);
  return pl.trackIds
    .map((id) => map.get(id))
    .filter((t): t is Track => !!t);
};

export const selectDisplayTracks = (state: MusicState): Track[] => {
  if (!state.displayOrder || state.displayOrder.length === 0) return state.tracks;
  const map = getTrackMap(state.tracks);
  return state.displayOrder
    .map(id => map.get(id))
    .filter((t): t is Track => !!t);
};

// ── New Selectors for Browsing ──
export const selectArtists = (state: MusicState) => {
  const map = new Map<string, number>();
  for (const track of state.tracks) {
    if (track.artist) {
      map.set(track.artist, (map.get(track.artist) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count);
};

export const selectAlbums = (state: MusicState) => {
  const map = new Map<string, { album: string; artist: string; count: number; coverUrl?: string }>();
  for (const track of state.tracks) {
    if (track.album) {
      const entry = map.get(track.album);
      if (entry) {
        entry.count++;
      } else {
        map.set(track.album, { album: track.album, artist: track.artist, count: 1, coverUrl: track.coverUrl });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
};

export const selectGenres = (state: MusicState) => {
  const map = new Map<string, number>();
  for (const track of state.tracks) {
    if (track.genre) {
      map.set(track.genre, (map.get(track.genre) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
};

export const selectTracksByArtist = (artist: string) => (state: MusicState): Track[] => {
  return state.tracks.filter(t => t.artist === artist);
};

export const selectTracksByAlbum = (album: string) => (state: MusicState): Track[] => {
  return state.tracks.filter(t => t.album === album);
};

export const selectTracksByGenre = (genre: string) => (state: MusicState): Track[] => {
  return state.tracks.filter(t => t.genre === genre);
};

export const selectMoreFromArtist = (trackId: string, limit: number) => (state: MusicState): Track[] => {
  const current = state.tracks.find(t => t.id === trackId);
  if (!current || !current.artist) return [];
  return state.tracks.filter(t => t.artist === current.artist && t.id !== trackId).slice(0, limit);
};

export const selectSameAlbum = (trackId: string, limit: number) => (state: MusicState): Track[] => {
  const current = state.tracks.find(t => t.id === trackId);
  if (!current || !current.album) return [];
  return state.tracks.filter(t => t.album === current.album && t.id !== trackId).slice(0, limit);
};
