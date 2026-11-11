import { useState, useEffect, useMemo } from 'react';
import type { TvChannel } from '../iptvHelper';
import {
  IPTV_CATEGORIES,
  fetchChannelsByCategory,
  buildRealtimeEpgSlot,
  type EpgNowNextProgram,
} from '../services/iptvOrgApiService';

export function useLiveTvCatalog(currentChannel: TvChannel | null) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [categoryChannels, setCategoryChannels] = useState<TvChannel[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  useEffect(() => {
    if (activeCategory === 'all') {
      setCategoryChannels([]);
      return;
    }
    let cancelled = false;
    setIsLoadingCategory(true);
    fetchChannelsByCategory(activeCategory)
      .then((list) => {
        if (!cancelled) setCategoryChannels(list);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const currentEpg: EpgNowNextProgram | null = useMemo(
    () => buildRealtimeEpgSlot(currentChannel),
    [currentChannel]
  );

  return {
    categories: IPTV_CATEGORIES,
    activeCategory,
    setActiveCategory,
    categoryChannels,
    isLoadingCategory,
    currentEpg,
  };
}
