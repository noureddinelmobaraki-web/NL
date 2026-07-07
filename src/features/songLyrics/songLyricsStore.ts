import { create } from 'zustand';
import type { Song } from '../../types';
import type { OpenLyricsArgs } from './types';

interface State {
  song: Song | null;
  anchorEl: HTMLElement | null;
  getCurrentTime: () => number;
  onSeek: (t: number) => void;
  open: (args: OpenLyricsArgs) => void;
  toggle: (args: OpenLyricsArgs) => void;
  close: () => void;
}

const apply = (a: OpenLyricsArgs) => ({
  song: a.song,
  anchorEl: a.anchorEl,
  getCurrentTime: a.getCurrentTime,
  onSeek: a.onSeek,
});

export const useSongLyricsStore = create<State>((set, get) => ({
  song: null,
  anchorEl: null,
  getCurrentTime: () => 0,
  onSeek: () => {},
  open: (a) => set(apply(a)),
  toggle: (a) => {
    const cur = get().song;
    if (cur && cur.id === a.song.id) {
      set({ song: null, anchorEl: null });
      return;
    }
    set(apply(a));
  },
  close: () => set({ song: null, anchorEl: null }),
}));
