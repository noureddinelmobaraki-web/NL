// src/audio/nowPlayingBus.ts
// A tiny framework-agnostic "now playing" bus. Any audio producer (NL music,
// profile song, lens gallery, section music, previews...) can publish a
// human-readable label for whatever is currently audible, and the glass
// switcher notch subscribes to it. This lets the notch show the *name* of the
// file playing from ANY source, not only the NL music player.
import { useSyncExternalStore } from 'react';

export interface NowPlayingMeta {
  /** audioManager source key this label belongs to (e.g. 'profile', 'lens'). */
  source: string;
  /** Primary display text (track / file / section name). */
  title: string;
  /** Optional secondary text (artist / context). */
  subtitle?: string;
}

const listeners = new Set<() => void>();
let current: NowPlayingMeta | null = null;

function emit(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* a listener error must never break an audio producer */
    }
  });
}

export const nowPlayingBus = {
  set(meta: NowPlayingMeta): void {
    if (
      current &&
      current.source === meta.source &&
      current.title === meta.title &&
      current.subtitle === meta.subtitle
    ) {
      return; // no-op: avoids redundant re-renders
    }
    current = meta;
    emit();
  },
  /** Clear the label. Pass a source to only clear when it still owns the bus. */
  clear(source?: string): void {
    if (!current) return;
    if (source && current.source !== source) return;
    current = null;
    emit();
  },
  get(): NowPlayingMeta | null {
    return current;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

/** React hook: re-renders when the now-playing label changes. */
export function useNowPlayingMeta(): NowPlayingMeta | null {
  return useSyncExternalStore(
    (cb) => nowPlayingBus.subscribe(cb),
    () => nowPlayingBus.get(),
    () => null,
  );
}
