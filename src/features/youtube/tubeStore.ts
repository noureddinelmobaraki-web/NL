import { create } from 'zustand';

export interface TubeState {
  open: boolean;
  videoId: string | null;
  openTube: (videoId?: string | null) => void;
  closeTube: () => void;
}

export const useTubeStore = create<TubeState>((set) => ({
  open: false,
  videoId: null,
  openTube: (videoId = null) => set({ open: true, videoId }),
  closeTube: () => set({ open: false, videoId: null }),
}));
