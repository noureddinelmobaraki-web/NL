import { useState, useCallback } from 'react';
import { ASSETS } from '../constants/assets';

const ME_BIT_IMAGES = ASSETS.profile.me_bits;

export function useGalleryState() {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLensGalleryOpen, setIsLensGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const openGallery = useCallback((index: number) => {
    setIsGalleryOpen(true);
    setSelectedImageIndex(index);
  }, []);

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false);
  }, []);

  const nextImage = useCallback(() => {
    setSelectedImageIndex(prev => (prev !== null ? (prev < ME_BIT_IMAGES.length - 1 ? prev + 1 : 0) : 0));
  }, []);

  const prevImage = useCallback(() => {
    setSelectedImageIndex(prev => (prev !== null ? (prev > 0 ? prev - 1 : ME_BIT_IMAGES.length - 1) : ME_BIT_IMAGES.length - 1));
  }, []);

  const openLens = useCallback((index: number = 0) => {
    setIsLensGalleryOpen(true);
    setSelectedImageIndex(index);
  }, []);

  const closeLens = useCallback(() => {
    setIsLensGalleryOpen(false);
  }, []);

  const getActiveContext = useCallback(() => {
    if (isLensGalleryOpen) return 'lens';
    if (isGalleryOpen) return 'mebit';
    return null;
  }, [isLensGalleryOpen, isGalleryOpen]);

  return {
    isGalleryOpen,
    setIsGalleryOpen,
    isLensGalleryOpen,
    setIsLensGalleryOpen,
    selectedImageIndex,
    setSelectedImageIndex,
    openGallery,
    closeGallery,
    nextImage,
    prevImage,
    openLens,
    closeLens,
    getActiveContext,
  };
}
