/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { Theme } from '../../../utils/userPrefs';
import {
  PAGE_META,
  buildNotchDestinations,
  type PageKey,
} from '../notch.constants';

export function useNotchNavigationActions({
  close,
  isTouch,
}: {
  close: () => void;
  isTouch: boolean;
}) {
  const {
    theme,
    setTheme,
    returnToWelcome,
    navigateTo,
    openGames,
    closeGames,
    isGamesOpen,
    openMovies,
    closeMovies,
    isMoviesOpen,
    isSeriesOpen,
    openTv,
    closeTv,
    isTvOpen,
    isRetroOpen,
    openRetro,
    closeRetro,
    isXpOpen,
    openXp,
    closeXp,
    isMusicOpen,
    openMusic,
    closeMusic,
    isAccountsOpen,
    openAccounts,
    closeAccounts,
    isLiquidGlassOpen,
  } = useAppContext();

  const vibrate = useCallback(() => {
    if (isTouch && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* ignore */
      }
    }
  }, [isTouch]);

  const pageKey: PageKey = isGamesOpen
    ? 'games'
    : isMoviesOpen || isSeriesOpen
      ? 'cinema'
      : isTvOpen
        ? 'tv'
        : isRetroOpen
          ? 'retro'
          : isXpOpen
            ? 'xp'
            : isMusicOpen
              ? 'music'
              : isAccountsOpen
                ? 'accounts'
                : isLiquidGlassOpen
                  ? 'liquidGlass'
                  : 'home';

  const pageMeta = PAGE_META[pageKey];

  const goto =
    (isActive: boolean, openFn: () => void, closeFn: () => void) => () => {
      if (isActive) closeFn();
      else openFn();
      close();
      vibrate();
    };

  const goHome = () => {
    navigateTo('home');
    setTheme('midnight');
    close();
    vibrate();
  };

  const destinations = buildNotchDestinations({
    pageKey,
    goHome,
    goto,
    isGamesOpen,
    openGames,
    closeGames,
    isMoviesOpen,
    openMovies,
    closeMovies,
    isTvOpen,
    openTv,
    closeTv,
    isRetroOpen,
    openRetro,
    closeRetro,
    isXpOpen,
    openXp,
    closeXp,
    isMusicOpen,
    openMusic,
    closeMusic,
    isAccountsOpen,
    openAccounts,
    closeAccounts,
  });

  const handleModeSelect = (id: Theme) => {
    const nextTheme: Theme = theme === id ? 'midnight' : id;
    setTheme(nextTheme);
    close();
    vibrate();
  };

  return {
    theme,
    returnToWelcome,
    pageKey,
    pageMeta,
    destinations,
    vibrate,
    handleModeSelect,
  };
}
