/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * GamesPage — Multi-Engine Aero Glass Window Coordinator
 * Preserves 100% of the visual structure (.nl-games-root, .nl-games-video,
 * .nl-games-backdrop, .nl-games-window, .nl-games-titlebar, .nl-games-sidebar,
 * .nl-games-main) while integrating the unified multi-engine catalog.
 */

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDeviceType } from '../../hooks/useDeviceType';
import { GameScreen } from './GameScreen';
import { GAMES_BG_VIDEO } from '../../constants/assets';
import {
  useUnifiedGamesCatalog,
  useGameBundleResolver,
  useGameSelection,
  useGamesPageLifecycle,
} from './hooks';
import { SidebarSearchAndSort } from './components/SidebarSearchAndSort';
import { SidebarCategoryPills } from './components/SidebarCategoryPills';
import { EnhancedGameListItem } from './components/EnhancedGameListItem';
import './games.css';

interface GamesPageProps {
  onClose: () => void;
}

export function GamesPage({ onClose }: GamesPageProps) {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const isTouch = isMobile || isTablet;

  const {
    allCatalog,
    filteredGames,
    activeCategory,
    setActiveCategory,
    activeFlashSubGenre,
    setActiveFlashSubGenre,
    searchQuery,
    setSearchQuery,
    favorites,
    toggleFavorite,
    markGamePlayed,
  } = useUnifiedGamesCatalog();

  const { selectedId, setSelectedId, selectedGame, handleSelectGame } =
    useGameSelection(allCatalog, markGamePlayed);

  useGamesPageLifecycle({
    selectedId,
    setSelectedId,
    isTouch,
    onClose,
  });

  const { bundle, resolving, resolveError } =
    useGameBundleResolver(selectedGame);

  const bgVideo = (
    <video
      className="nl-games-video"
      src={GAMES_BG_VIDEO}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  );

  const list = (
    <aside className="nl-games-sidebar" aria-label={t('games.title')}>
      <div className="nl-sidebar-heading">{t('games.subtitle')}</div>
      <SidebarSearchAndSort
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalDisplayed={filteredGames.length}
      />
      <SidebarCategoryPills
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        activeFlashSubGenre={activeFlashSubGenre}
        onSelectFlashSubGenre={setActiveFlashSubGenre}
        favoritesCount={favorites.length}
      />
      <ul className="nl-game-list">
        {filteredGames.map((g) => (
          <EnhancedGameListItem
            key={g.id}
            game={g}
            isSelected={g.id === selectedId}
            isFavorite={favorites.includes(g.id)}
            onSelect={handleSelectGame}
            onToggleFavorite={toggleFavorite}
          />
        ))}
        {filteredGames.length === 0 && (
          <li className="nl-game-empty">No matching games found</li>
        )}
      </ul>
    </aside>
  );

  // ── هاتف: قائمة كاملة → لعبة كاملة ─────────────────────────────
  if (isTouch) {
    return createPortal(
      <div
        className="nl-games-root is-touch pointer-events-auto"
        dir="ltr"
        role="dialog"
        aria-modal="true"
        aria-label={t('games.title')}
      >
        {bgVideo}
        <div className="nl-games-backdrop" aria-hidden="true" />
        <div className="nl-games-window">
          {!selectedId ? (
            <>
              <header className="nl-games-titlebar">
                <div className="nl-games-brand">
                  <span className="nl-games-logo" aria-hidden="true" />
                  <span className="nl-games-title">{t('games.title')}</span>
                </div>
                <button
                  type="button"
                  className="nl-games-close"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </header>
              <div className="nl-games-body nl-games-body--list">{list}</div>
            </>
          ) : (
            <main className="nl-games-main nl-games-main--full">
              <GameScreen
                selectedGame={selectedGame}
                bundle={bundle}
                resolvingBundle={resolving}
                resolveError={resolveError}
                isTouch
                onBack={() => setSelectedId(null)}
                onClose={onClose}
              />
            </main>
          )}
        </div>
      </div>,
      document.body,
    );
  }

  // ── حاسوب: قائمة جانبية + شاشة دائمة ───────────────────────────
  return createPortal(
    <div
      className="nl-games-root pointer-events-auto"
      dir="ltr"
      role="dialog"
      aria-modal="true"
      aria-label={t('games.title')}
    >
      {bgVideo}
      <div className="nl-games-backdrop" aria-hidden="true" />
      <div className="nl-games-window">
        <header className="nl-games-titlebar">
          <div className="nl-games-brand">
            <span className="nl-games-logo" aria-hidden="true" />
            <span className="nl-games-title">{t('games.title')}</span>
          </div>
          <button
            type="button"
            className="nl-games-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="nl-games-body">
          {list}
          <main className="nl-games-main">
            <GameScreen
              selectedGame={selectedGame}
              bundle={bundle}
              resolvingBundle={resolving}
              resolveError={resolveError}
              isTouch={false}
              onBack={selectedId ? () => setSelectedId(null) : undefined}
              onClose={onClose}
            />
          </main>
        </div>
      </div>
    </div>,
    document.body,
  );
}
