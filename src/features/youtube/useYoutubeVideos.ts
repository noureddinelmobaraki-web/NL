import { useEffect, useState } from 'react';
import type { YouTubeVideo } from './types';
import { loadYoutubeFeed } from './loadYoutube';

interface State {
  videos: YouTubeVideo[];
  loading: boolean;
  error: boolean;
  updatedAt: string;
}

export function useYoutubeVideos(enabled: boolean): State {
  const [state, setState] = useState<State>({ videos: [], loading: enabled, error: false, updatedAt: '' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadYoutubeFeed()
      .then((feed) => {
        if (alive) {
          setState({ videos: feed.videos, loading: false, error: false, updatedAt: feed.updatedAt });
        }
      })
      .catch(() => {
        if (alive) {
          setState({ videos: [], loading: false, error: true, updatedAt: '' });
        }
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}
