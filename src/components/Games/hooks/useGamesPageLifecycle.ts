/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useGamesMusic } from './useGamesMusic';

export interface UseGamesPageLifecycleOptions {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isTouch: boolean;
  onClose: () => void;
}

export function useGamesPageLifecycle({
  selectedId,
  setSelectedId,
  isTouch,
  onClose,
}: UseGamesPageLifecycleOptions) {
  const { setGameActive, registerGameBack } = useAppContext();

  // موسيقى الوضع: تتوقف عند تشغيل لعبة وتستأنف عند الرجوع للقائمة
  useGamesMusic(Boolean(selectedId));

  // أبلغ Context + اسجّل callback العودة للقائمة
  useEffect(() => {
    setGameActive(Boolean(selectedId));
    registerGameBack(() => setSelectedId(null));
  }, [selectedId, setGameActive, registerGameBack, setSelectedId]);

  // تنظيف عند إلغاء التركيب
  useEffect(() => {
    return () => {
      setGameActive(false);
    };
  }, [setGameActive]);

  // قفل تمرير الصفحة
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('nl-games-active');
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('nl-games-active');
    };
  }, []);

  // Esc: رجوع من لعبة → قائمة، أو إغلاق الصفحة
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.fullscreenElement) return;
      if (isTouch && selectedId) setSelectedId(null);
      else onClose();
    },
    [onClose, isTouch, selectedId, setSelectedId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  return {
    handleEsc,
  };
}

export type UseGamesPageLifecycleResult = ReturnType<typeof useGamesPageLifecycle>;
