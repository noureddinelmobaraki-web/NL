/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { audioEngine } from '../../engine/audioEngine';
import type { MusicState } from '../musicStore';

export function getNextTrackId(
  queue: string[],
  index: number,
  shuffle: boolean,
  shuffleQueue: string[],
): string | null {
  const activeQueue = shuffle ? shuffleQueue : queue;
  if (activeQueue.length === 0) return null;
  const nextIdx = index + 1;
  if (nextIdx >= activeQueue.length) return null;
  return activeQueue[nextIdx];
}

export function createQueueActions(
  set: (partial: Partial<MusicState> | ((state: MusicState) => Partial<MusicState>)) => void,
  get: () => MusicState,
) {
  return {
    setRepeat: (mode: 'off' | 'all' | 'one') => set({ repeat: mode }),

    toggleShuffle: () => {
      const { shuffle, queue, currentId } = get();
      const nextShuffle = !shuffle;
      let shuffleQueue: string[] = [];

      if (nextShuffle) {
        shuffleQueue = [...queue];
        for (let i = shuffleQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
        }

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

    setCrossfadeSec: (sec: number) => {
      set({ crossfadeSec: sec });
      audioEngine.setCrossfadeSec(sec);
    },

    addToQueue: (trackId: string) => {
      const { queue, shuffleQueue, shuffle } = get();
      if (queue.includes(trackId)) return;
      const nextQueue = [...queue, trackId];
      const nextShuffleQueue = shuffle ? [...shuffleQueue, trackId] : [];
      set({ queue: nextQueue, shuffleQueue: nextShuffleQueue });
    },

    removeFromQueue: (trackId: string) => {
      const { queue, shuffleQueue, currentId } = get();
      const nextQueue = queue.filter((id) => id !== trackId);
      const nextShuffleQueue = shuffleQueue.filter((id) => id !== trackId);

      const nextIdx = nextQueue.indexOf(currentId || '');
      set({
        queue: nextQueue,
        shuffleQueue: nextShuffleQueue,
        queueIndex: nextIdx,
      });
    },

    clearQueue: () => {
      set({ queue: [], shuffleQueue: [], queueIndex: -1, currentId: undefined });
      audioEngine.pause();
    },

    setQueue: (trackIds: string[], index = 0) => {
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
        currentId: trackIds[index],
      });
    },

    reorderQueue: (newOrder: string[]) => {
      const { currentId } = get();
      const index = newOrder.indexOf(currentId || '');
      set({ queue: newOrder, queueIndex: index });
    },
  };
}
