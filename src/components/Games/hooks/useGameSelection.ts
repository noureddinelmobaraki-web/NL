/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useMemo, useState } from 'react';
import type { UnifiedGameItem } from '../types/games.types';

export function useGameSelection(
  allCatalog: UnifiedGameItem[],
  markGamePlayed: (id: string) => void
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedGame = useMemo(
    () => allCatalog.find((g) => g.id === selectedId) ?? null,
    [allCatalog, selectedId]
  );

  const handleSelectGame = useCallback(
    (id: string) => {
      setSelectedId(id);
      markGamePlayed(id);
    },
    [markGamePlayed]
  );

  return {
    selectedId,
    setSelectedId,
    selectedGame,
    handleSelectGame,
  };
}

export type UseGameSelectionResult = ReturnType<typeof useGameSelection>;
