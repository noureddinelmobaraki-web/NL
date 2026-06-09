/**
 * Smoke test for the SongCard shell. Uses React 19's createRoot directly to
 * avoid a hard dependency on @testing-library/react.
 *
 * We mock framer-motion and OsWindow because both are visual wrappers and
 * are not relevant to the structural smoke test.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { SongCard } from './SongCard';
import type { Song } from '../../types';

// Bypass framer-motion / OsWindow shells.
vi.mock('../OsWindow', () => ({
  OsWindow: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: any) =>
        React.createElement('div', props, props.children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const song: Song = {
  id: 1,
  title: 'Test Song',
  url: 'https://example.com/song.mp3',
  lrc: null,
  backgroundImage: 'https://example.com/bg.jpg',
};

let container: HTMLDivElement;

beforeEach(() => {
  sessionStorage.clear();
  (globalThis as any).IntersectionObserver = class {
    observe() {} disconnect() {} unobserve() {} takeRecords() { return []; }
    root = null; rootMargin = ''; thresholds = [];
  };
  (window as any).matchMedia = (q: string) => ({
    matches: false, media: q,
    onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => container.remove());

const mount = (props: Partial<React.ComponentProps<typeof SongCard>>) => {
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(SongCard, {
        song, index: 0,
        isActive: false, isActiveInBar: false,
        isPlaying: false, isWaiting: false,
        onPlay: () => {}, setLyricsOpen: () => {},
        ...(props as any),
      }),
    );
  });
  return () => act(() => root.unmount());
};

describe('SongCard — smoke', () => {
  it('renders the inactive card without crashing', () => {
    const unmount = mount({});
    expect(container.querySelector('#song-card-1')).toBeTruthy();
    unmount();
  });

  it('renders the active card and exposes its aria-label', () => {
    const unmount = mount({ isActive: true, isActiveInBar: true, isPlaying: true });
    const btn = container.querySelector('[aria-label="Play song Test Song"]');
    expect(btn).toBeTruthy();
    unmount();
  });

  it('renders the "lyrics not available" placeholder when song.lrc is null AND lyrics open', () => {
    const unmount = mount({ isActive: true, isLyricsOpen: true });
    // The placeholder text appears either inline or in the popover wrapper.
    expect(container.textContent).toContain('الكلمات غير متوفرة');
    unmount();
  });
});
