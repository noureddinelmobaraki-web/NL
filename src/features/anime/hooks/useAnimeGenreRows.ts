/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useMemo } from 'react';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';

export function useAnimeGenreRows(cinemaItems: CinemaItem[]) {
  const shonenRow = useMemo(
    () =>
      cinemaItems.filter((it) =>
        it.genreNames.some((g) => /action|adventure|fantasy/i.test(g))
      ),
    [cinemaItems]
  );

  const seinenMysteryRow = useMemo(
    () =>
      cinemaItems.filter((it) =>
        it.genreNames.some((g) => /drama|mystery|thriller|sci-fi|supernatural|suspense/i.test(g))
      ),
    [cinemaItems]
  );

  return {
    shonenRow,
    seinenMysteryRow,
  };
}

export type UseAnimeGenreRowsResult = ReturnType<typeof useAnimeGenreRows>;
