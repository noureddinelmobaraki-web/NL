import { useState, useCallback, useEffect, useRef } from 'react';

interface UseModalLifecycleOptions {
  initialOpen?: boolean;
  lockBodyScroll?: boolean;
  closeOnEsc?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  animationMs?: number;
}

export function useModalLifecycle(options: UseModalLifecycleOptions = {}) {
  const { initialOpen = false, lockBodyScroll = true, closeOnEsc = true, onOpen, onClose, animationMs = 300 } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    setIsAnimating(true);
    onOpen?.();
    setTimeout(() => setIsAnimating(false), animationMs);
  }, [onOpen, animationMs]);

  const close = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
      previousFocusRef.current?.focus();
      onClose?.();
    }, animationMs);
  }, [onClose, animationMs]);

  useEffect(() => {
    if (!isOpen || !lockBodyScroll) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isOpen, lockBodyScroll]);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closeOnEsc, close]);

  return { isOpen, isAnimating, open, close, toggle: useCallback(() => isOpen ? close() : open(), [isOpen, open, close]), containerRef };
}
