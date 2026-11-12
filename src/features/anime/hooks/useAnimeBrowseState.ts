/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { AnimeAudioMode, AnimeCategoryFilter } from '../types/anime.types';

export function useAnimeBrowseState() {
  const [activeTab, setActiveTab] = useState<AnimeCategoryFilter>('trending');
  const [audioMode, setAudioMode] = useState<AnimeAudioMode>('sub');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 340);

  return {
    activeTab,
    setActiveTab,
    audioMode,
    setAudioMode,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
}

export type UseAnimeBrowseStateResult = ReturnType<typeof useAnimeBrowseState>;
