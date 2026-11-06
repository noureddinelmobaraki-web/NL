import { useEffect, useRef } from 'react';

const PENDING_SONG_KEY = 'nl:pending-song';

export function readPendingSong(): string | null {
  try {
    const p = new URLSearchParams(window.location.search).get('song');
    if (p && p.startsWith('fv-')) {
      sessionStorage.setItem(PENDING_SONG_KEY, p);
      return p;
    }
    return sessionStorage.getItem(PENDING_SONG_KEY);
  } catch {
    return null;
  }
}

export function usePendingSongDeepLink(
  loaded: boolean,
  setLoaded: (loaded: boolean) => void,
  openMusic: () => void,
): boolean {
  const bootedFromDeepLink = useRef(readPendingSong() !== null).current;

  useEffect(() => {
    const pending = readPendingSong();
    if (!pending) return;
    if (!loaded) {
      setLoaded(true);
      return;
    }
    openMusic();
  }, [loaded, openMusic, setLoaded]);

  return bootedFromDeepLink;
}
