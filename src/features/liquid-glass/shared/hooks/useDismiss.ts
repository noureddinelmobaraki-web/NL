/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect, useRef } from 'react';

export interface UseDismissOptions {
  open: boolean;
  onDismiss: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function useDismiss<T extends HTMLElement = HTMLElement>({
  open,
  onDismiss,
  triggerRef,
}: UseDismissOptions): React.RefObject<T | null> {
  const panelRef = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (triggerRef?.current && triggerRef.current.contains(target)) return;
      onDismiss();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Intercept during capture phase and stop immediate propagation
        // so that the parent stage or backdrop doesn't close on the same Escape
        e.stopImmediatePropagation();
        e.preventDefault();
        onDismiss();
        triggerRef?.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [open, onDismiss, triggerRef]);

  return panelRef;
}
