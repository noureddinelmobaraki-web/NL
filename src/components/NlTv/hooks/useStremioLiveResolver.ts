import { useState, useEffect } from 'react';
import { fetchStremioLiveCatalog, type StremioLiveChannel } from '../services/stremioAddonsClient';

export function useStremioLiveResolver(enabled: boolean) {
  const [stremioChannels, setStremioChannels] = useState<StremioLiveChannel[]>([]);
  const [isLoadingStremio, setIsLoadingStremio] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoadingStremio(true);
    fetchStremioLiveCatalog()
      .then((list) => {
        if (!cancelled) setStremioChannels(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStremio(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    stremioChannels,
    isLoadingStremio,
  };
}
