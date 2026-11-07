/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import type { Track } from '../../engine/types';
import { audioEngine } from '../../engine/audioEngine';
import { logPlay } from '../../data/playTracking';
import { getNextTrackId } from './queueSlice';
import type { MusicState } from '../musicStore';

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

export function createPlaybackActions(
  set: (partial: Partial<MusicState> | ((state: MusicState) => Partial<MusicState>)) => void,
  get: () => MusicState,
) {
  return {
    setTracks: (tracks: Track[]) =>
      set((s) => {
        const ids = tracks.map((t) => t.id);
        const order = [...ids];
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        return { ...s, tracks, displayOrder: order, status: 'ready' };
      }),
    setStatus: (status: 'idle' | 'loading' | 'ready' | 'error', error?: string) =>
      set({ status, error }),

    playTrack: async (id: string, startAutoplay = true) => {
      const { tracks, queue, shuffle, actions } = get();
      const track = tracks.find((t) => t.id === id);
      if (!track) return;

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
          if (curIdx !== -1) {
            nextShuffleQueue.splice(curIdx, 1);
            nextShuffleQueue.unshift(id);
          }
        }
        set({ currentId: id, queue: workingQueue, queueIndex: index, shuffleQueue: nextShuffleQueue });
      } else {
        set({ currentId: id, queueIndex: index });
      }

      actions.addPlayedHistory(id);

      logPlay({
        item_type: 'song',
        item_id: track.id,
        title: track.title,
        seconds: Math.round(track.durationSec || 0),
      });

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
          return;
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
          return;
        }
      }

      const targetId = activeQueue[prevIdx];
      const actualIndexInMainQueue = queue.indexOf(targetId);

      set({ queueIndex: actualIndexInMainQueue, currentId: targetId });
      actions.playTrack(targetId, true);
    },

    seek: (sec: number) => {
      audioEngine.seek(sec);
    },

    setVolume: (v: number) => {
      set({ volume: v });
      audioEngine.setVolume(v);
    },

    setMuted: (m: boolean) => {
      set({ muted: m });
      audioEngine.setMuted(m);
    },

    setRate: (r: number) => {
      set({ rate: r });
      audioEngine.setRate(r);
    },

    setPan: (p: number) => {
      set({ pan: p });
      audioEngine.setPan(p);
    },

    setLoopStart: (sec: number | null) => {
      set({ loopStart: sec });
      audioEngine.setLoop(sec, get().loopEnd);
    },
    setLoopEnd: (sec: number | null) => {
      set({ loopEnd: sec });
      audioEngine.setLoop(get().loopStart, sec);
    },
    setSleepTimer: (minutes: number | null) => {
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
          const currentSec = get().sleepTimer;
          if (currentSec !== null && currentSec > 0) {
            const nextSec = currentSec - 1;
            set({ sleepTimer: nextSec });
            if (nextSec === 0) {
              get().actions.togglePlay();
              get().actions.setSleepTimer(null);
            }
          }
        }, 1000);
      }
    },

    updatePlaybackProgress: (currentTime: number, duration: number, buffered: number) => {
      set({ currentTime, duration, buffered });
    },

    setPlaying: (isPlaying: boolean) => {
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

    setCurrentTrackId: (id: string) => {
      const { queue } = get();
      const idx = queue.indexOf(id);
      set({ currentId: id, queueIndex: idx !== -1 ? idx : 0 });
      get().actions.addPlayedHistory(id);
    },
  };
}
