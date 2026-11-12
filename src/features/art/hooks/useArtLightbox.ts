/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useState } from 'react';
import type { ArtMuseumPiece } from '../types/art.types';

export function useArtLightbox() {
  const [selectedArtwork, setSelectedArtwork] = useState<ArtMuseumPiece | null>(null);

  const open = useCallback((piece: ArtMuseumPiece) => {
    setSelectedArtwork(piece);
  }, []);

  const close = useCallback(() => {
    setSelectedArtwork(null);
  }, []);

  return {
    selectedArtwork,
    setSelectedArtwork,
    open,
    close,
  };
}

export type UseArtLightboxResult = ReturnType<typeof useArtLightbox>;
