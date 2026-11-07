/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { m, AnimatePresence } from "framer-motion";
import { useEffect, Suspense } from "react";
import { savePrefs } from './utils/userPrefs';
import { applyTheme as applyThemeUtil } from './utils/themeSwitcher';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { PageLoader } from "./components/layout/PageLoader";
import { PAGES } from './context/pages';
import { NotchIsland } from "./components/notch/NotchIsland";
import { NowPlayingBridge } from './audio/NowPlayingBridge';
import { MusicEngineHost } from './features/music/MusicEngineHost';
import { AppProvider, useAppContext } from './context/AppContext';
import { isAutomatedEnv } from './utils/env';
import { usePendingSongDeepLink } from './hooks/usePendingSongDeepLink';
import { initLiquidGlassPhysics } from './utils/liquidGlassPhysics';
import { MainHomeScreen } from './components/app/MainHomeScreen';

const NL_ENTER_FADE = { opacity: 0 } as const;

function AppStageRouter() {
  const {
    theme,
    loaded,
    setLoaded,
    isGamesOpen,
    closeGames,
    isMoviesOpen,
    closeMovies,
    isSeriesOpen,
    closeSeries,
    isTvOpen,
    closeTv,
    isRetroOpen,
    closeRetro,
    isXpOpen,
    closeXp,
    isMusicOpen,
    isAccountsOpen,
    closeAccounts,
    isPortraitOpen,
    isLiquidGlassOpen,
    liquidGlassMode,
    closeLiquidGlass,
    endTransition,
    openMusic,
  } = useAppContext();
  const isAutomated = isAutomatedEnv();
  const bootedFromDeepLink = usePendingSongDeepLink(loaded, setLoaded, openMusic);

  useEffect(() => {
    applyThemeUtil(theme);
    savePrefs({ theme });
  }, [theme]);

  useEffect(() => {
    return initLiquidGlassPhysics();
  }, []);

  const activeOverlayId = isGamesOpen
    ? 'games'
    : isTvOpen
      ? 'tv'
      : isMoviesOpen || isSeriesOpen
        ? 'cinema'
        : isRetroOpen
          ? 'retro'
          : isXpOpen
            ? 'xp'
            : isMusicOpen
              ? 'music'
              : isAccountsOpen
                ? 'accounts'
                : isPortraitOpen
                  ? 'portrait'
                  : isLiquidGlassOpen
                    ? 'liquidGlass'
                    : null;

  const isAnyPageActive = activeOverlayId !== null;

  useEffect(() => {
    if (isAnyPageActive) {
      document.documentElement.setAttribute('data-page-active', 'true');
    } else {
      document.documentElement.removeAttribute('data-page-active');
    }
  }, [isAnyPageActive]);

  const activePageKey = !loaded ? 'welcome' : activeOverlayId ?? 'home';

  useEffect(() => {
    document.documentElement.setAttribute('data-active-page', activePageKey);
  }, [activePageKey]);

  const activeDescriptor = loaded && activeOverlayId ? PAGES[activeOverlayId] : null;
  const ActiveOverlayComponent = activeDescriptor?.component ?? null;

  const overlayProps: Record<string, unknown> =
    activeOverlayId === 'games'
      ? { onClose: closeGames }
      : activeOverlayId === 'tv'
        ? { onClose: closeTv }
        : activeOverlayId === 'cinema'
          ? {
              onClose: isSeriesOpen ? closeSeries : closeMovies,
              initialTab: isSeriesOpen ? 'series' : 'movies',
            }
          : activeOverlayId === 'retro'
            ? { onClose: closeRetro }
            : activeOverlayId === 'xp'
              ? { onClose: closeXp }
              : activeOverlayId === 'accounts'
                ? { onClose: closeAccounts }
                : activeOverlayId === 'liquidGlass'
                  ? { onClose: closeLiquidGlass, initialMode: liquidGlassMode }
                  : {};

  return (
    <>
      {loaded && (
        <>
          <NotchIsland />
          <NowPlayingBridge />
          <MusicEngineHost />
        </>
      )}
      <AnimatePresence mode="wait" onExitComplete={endTransition}>
        {activeDescriptor && ActiveOverlayComponent ? (
          <m.div
            key={activeDescriptor.key}
            data-mode={theme}
            initial={isAutomated || bootedFromDeepLink ? false : NL_ENTER_FADE}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={activeDescriptor.wrapperClassName}
          >
            <SectionErrorBoundary sectionName={activeDescriptor.sectionName}>
              <Suspense fallback={<PageLoader pageType={activeDescriptor.loaderType} />}>
                <ActiveOverlayComponent {...overlayProps} />
              </Suspense>
            </SectionErrorBoundary>
          </m.div>
        ) : (
          <m.div
            key="main-app-screen"
            initial={isAutomated || bootedFromDeepLink ? false : NL_ENTER_FADE}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <MainHomeScreen />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <SectionErrorBoundary sectionName="App">
      <AppProvider>
        <AppStageRouter />
      </AppProvider>
    </SectionErrorBoundary>
  );
}
