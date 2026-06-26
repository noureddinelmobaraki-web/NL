import { MusicState } from './musicStore';
import { Track } from '../engine/types';

/**
 * ⚠️ zustand v5: أي محدّد يُعيد مصفوفة/كائنًا جديدًا (مثل .map/.filter)
 * يجب استخدامه دائمًا عبر useMusicStore(useShallow(selector))
 * وإلا تحدث حلقة إعادة عرض لا نهائية (Maximum update depth exceeded).
 */
export const selectCurrentTrack = (state: MusicState): Track | undefined => {
  if (!state.currentId) return undefined;
  return state.tracks.find((t) => t.id === state.currentId);
};

export const selectFavoriteTracks = (state: MusicState): Track[] => {
  return state.tracks.filter((t) => state.favorites.includes(t.id));
};

export const selectHistoryTracks = (state: MusicState): Track[] => {
  return state.history
    .map((id) => state.tracks.find((t) => t.id === id))
    .filter((t): t is Track => !!t);
};

export const selectQueueTracks = (state: MusicState): Track[] => {
  return state.queue
    .map((id) => state.tracks.find((t) => t.id === id))
    .filter((t): t is Track => !!t);
};

export const selectPlaylistTracks = (playlistId: string) => (state: MusicState): Track[] => {
  const pl = state.playlists.find((p) => p.id === playlistId);
  if (!pl) return [];
  return pl.trackIds
    .map((id) => state.tracks.find((t) => t.id === id))
    .filter((t): t is Track => !!t);
};
