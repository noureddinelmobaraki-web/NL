/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useState } from 'react';
import type { SpacetoonPlanetId } from '../types/cartoon.types';

export function useCartoonFilters() {
  const [activePlanet, setActivePlanet] = useState<SpacetoonPlanetId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  return {
    activePlanet,
    setActivePlanet,
    searchQuery,
    setSearchQuery,
  };
}

export type UseCartoonFiltersResult = ReturnType<typeof useCartoonFilters>;
