import { useEffect, useState } from 'react';

let loading: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return loading;
}

export function useYouTubeIframeApi(): boolean {
  const [ready, setReady] = useState<boolean>(
    () => typeof window !== 'undefined' && !!(window.YT && window.YT.Player),
  );
  useEffect(() => {
    let alive = true;
    loadApi().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
