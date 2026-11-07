/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useState } from 'react';

export interface TubeTab {
  id: string;
  label: string;
  videoIds: string[];
}

interface CollectionsFile {
  tabs?: Array<{ id?: string; label?: string; videoIds?: string[] }>;
}

let cachedTabs: TubeTab[] | null = null;
let inflightTabs: Promise<TubeTab[]> | null = null;

function parseCollections(data: CollectionsFile): TubeTab[] {
  const list = Array.isArray(data?.tabs) ? data.tabs : [];
  const clean: TubeTab[] = [];
  for (const c of list) {
    if (c && c.id && Array.isArray(c.videoIds) && c.videoIds.length > 0) {
      clean.push({ id: c.id, label: c.label || c.id, videoIds: c.videoIds });
    }
  }
  return clean;
}

function fetchTubeCollections(): Promise<TubeTab[]> {
  if (cachedTabs) return Promise.resolve(cachedTabs);
  if (inflightTabs) return inflightTabs;
  const base = import.meta.env?.BASE_URL || '/';
  const url = `${base.endsWith('/') ? base : `${base}/`}data/youtube-collections.json`;
  inflightTabs = fetch(url, { cache: 'force-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<CollectionsFile>) : { tabs: [] }))
    .then((data) => {
      cachedTabs = parseCollections(data);
      return cachedTabs;
    })
    .catch(() => {
      cachedTabs = [];
      return cachedTabs;
    });
  return inflightTabs;
}

export function useTubeCollections(): TubeTab[] {
  const [tabs, setTabs] = useState<TubeTab[]>(() => cachedTabs ?? []);

  useEffect(() => {
    if (cachedTabs) {
      setTabs(cachedTabs);
      return;
    }
    let mounted = true;
    void fetchTubeCollections().then((loaded) => {
      if (mounted) setTabs(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return tabs;
}
