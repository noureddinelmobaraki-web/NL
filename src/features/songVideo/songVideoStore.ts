import { create } from 'zustand';
import { audioManager } from '../../audio/audioManager';

export interface SongVideoState {
  open: boolean;
  videoId: string | null;
  anchorEl: HTMLElement | null;
  openSongVideo: (videoId: string, anchorEl: HTMLElement | null) => void;
  close: () => void;
}

export const useSongVideoStore = create<SongVideoState>((set) => ({
  open: false,
  videoId: null,
  anchorEl: null,
  openSongVideo: (videoId, anchorEl) => {
    // Only the YouTube audio should be heard: silence the site's own player.
    try { audioManager.pause('song'); } catch { /* no active song */ }
    try { audioManager.pause('preview'); } catch { /* no preview */ }
    set({ open: true, videoId, anchorEl });
  },
  close: () => set({ open: false, videoId: null, anchorEl: null }),
}));
