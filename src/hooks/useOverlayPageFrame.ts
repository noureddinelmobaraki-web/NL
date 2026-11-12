/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * useOverlayPageFrame — Shared lifecycle for full-screen overlay pages:
 * body scroll lock + Escape-to-close (guarded) + hardware Back-to-close.
 */
import { useEffect, useRef } from 'react';
import { useBackToClose } from './useBackToClose';

export interface UseOverlayPageFrameOptions {
  onClose?: () => void;
  /** Return true when an inner layer (modal/player/lightbox) is open,
   *  so Escape/Back is left to that layer instead of closing the page. */
  isInnerLayerOpen?: () => boolean;
  lockBodyScroll?: boolean;
}

export function useOverlayPageFrame({
  onClose,
  isInnerLayerOpen,
  lockBodyScroll = true,
}: UseOverlayPageFrameOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const innerRef = useRef(isInnerLayerOpen);
  innerRef.current = isInnerLayerOpen;

  useEffect(() => {
    document.body.classList.add('nl-cinema-active');
    if (!lockBodyScroll) {
      return () => {
        document.body.classList.remove('nl-cinema-active');
      };
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('nl-cinema-active');
    };
  }, [lockBodyScroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (innerRef.current?.()) return;
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useBackToClose(Boolean(onClose), () => {
    if (innerRef.current?.()) return;
    onCloseRef.current?.();
  });
}
