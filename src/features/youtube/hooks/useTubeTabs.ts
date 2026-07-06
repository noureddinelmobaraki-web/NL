import { useMemo, useState } from 'react';
import type { YouTubeVideo } from '../types';
import type { TubeTab } from './useTubeCollections';

const ALL_TAB = 'all';

export function useTubeTabs(videos: YouTubeVideo[], tabs: TubeTab[]) {
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  const filtered = useMemo(() => {
    if (activeTab === ALL_TAB) return videos;
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return videos;
    const byId = new Map(videos.map((v) => [v.id, v] as const));
    const out: YouTubeVideo[] = [];
    for (const id of tab.videoIds) {
      const v = byId.get(id);
      if (v) out.push(v);
    }
    return out;
  }, [videos, tabs, activeTab]);

  return { activeTab, setActiveTab, filtered, allTabId: ALL_TAB };
}
