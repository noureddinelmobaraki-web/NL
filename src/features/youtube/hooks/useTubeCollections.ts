import { useMemo } from 'react';
import collectionsRaw from '../../../../public/data/youtube-collections.json';

export interface TubeTab {
  id: string;
  label: string;
  videoIds: string[];
}

interface CollectionsFile {
  tabs?: Array<{ id?: string; label?: string; videoIds?: string[] }>;
}

export function useTubeCollections(): TubeTab[] {
  return useMemo(() => {
    const data = collectionsRaw as CollectionsFile;
    const list = Array.isArray(data.tabs) ? data.tabs : [];
    const clean: TubeTab[] = [];
    for (const c of list) {
      if (c && c.id && Array.isArray(c.videoIds) && c.videoIds.length > 0) {
        clean.push({ id: c.id, label: c.label || c.id, videoIds: c.videoIds });
      }
    }
    return clean;
  }, []);
}
