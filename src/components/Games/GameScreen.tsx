/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Unified Multi-Engine GameScreen (.nl-screen)
 * Automatically switches between Ruffle (.swf), Nostalgist (NES/GBA/GB/Genesis),
 * js-dos (.jsdos), HTML5 Embeds, and Instant API Mini-Games inside the exact
 * same .nl-screen container.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TouchControls } from './TouchControls';
import type {
  ResolvedGameBundle,
  UnifiedGameItem,
} from './types/games.types';
import { useEmulatorLifecycle } from './hooks/useEmulatorLifecycle';
import { usePhysicalGamepad } from './hooks/usePhysicalGamepad';
import { useMobileTouchLayout } from './hooks/useMobileTouchLayout';
import { useGameSaveState } from './hooks/useGameSaveState';
import { RuffleEngineView } from './engines/RuffleEngineView';
import { RetroConsoleEngineView } from './engines/RetroConsoleEngineView';
import { DosEngineView } from './engines/DosEngineView';
import { Html5EmbedEngineView } from './engines/Html5EmbedEngineView';
import { MiniGamesNativeView } from './engines/MiniGamesNativeView';
import { GameScreenTopBar } from './components/GameScreenTopBar';
import { MobileLandscapePrompt } from './components/MobileLandscapePrompt';

export interface GameScreenProps {
  selectedGame: UnifiedGameItem | null;
  bundle: ResolvedGameBundle | null;
  resolvingBundle?: boolean;
  resolveError?: string | null;
  isTouch: boolean;
  /** العودة لقائمة الألعاب (إغلاق اللعبة فقط) */
  onBack?: () => void;
  /** إغلاق صفحة الألعاب بالكامل */
  onClose?: () => void;
}

const BAR_HIDE_MS = 7000;

export function GameScreen({
  selectedGame,
  bundle,
  resolvingBundle = false,
  resolveError = null,
  isTouch,
  onBack,
}: GameScreenProps) {
  const { t } = useTranslation();
  const screenRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasGame = Boolean(selectedGame);
  const gameId = selectedGame?.id ?? null;

  const { isMuted, toggleMute, registerController, activeControllerRef } =
    useEmulatorLifecycle(gameId);

  const {
    showTouchControls,
    toggleTouchControls,
    controlProfile,
    cycleControlProfile,
    isPseudoFullscreen,
    toggleSmartFullscreen,
  } = useMobileTouchLayout(
    selectedGame?.controlProfile || 'flash-pc',
    gameId,
    screenRef,
  );

  const { hasSavedState, saveToast, saveSnapshot, loadSnapshot } =
    useGameSaveState(gameId);

  const getTargetEl = useCallback(() => targetElementRef.current, []);
  const { gamepadConnected } = usePhysicalGamepad(hasGame && engineReady, getTargetEl);

  const handleTargetElementChange = useCallback((el: HTMLElement | null) => {
    targetElementRef.current = el;
  }, []);

  // شريط الهاتف العائم: يختفي بعد 7 ثوانٍ، يظهر بلمس منطقته العلوية
  const armHideTimer = useCallback(() => {
    if (!isTouch) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setBarVisible(false), BAR_HIDE_MS);
  }, [isTouch]);

  const revealBar = useCallback(() => {
    setBarVisible(true);
    armHideTimer();
  }, [armHideTimer]);

  useEffect(() => {
    if (!isTouch) {
      setBarVisible(true);
      return;
    }
    setBarVisible(true);
    armHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isTouch, gameId, armHideTimer]);

  const handleReload = useCallback(() => {
    setReloadToken((x) => x + 1);
  }, []);

  return (
    <div
      className={`nl-screen-wrap${isTouch ? ' is-touch' : ''}${isPseudoFullscreen ? ' is-pseudo-fs' : ''}`}
    >
      {isTouch && !barVisible && (
        <button
          type="button"
          className="nl-screen-reveal"
          aria-label={t('games.controls')}
          onClick={revealBar}
        />
      )}

      <GameScreenTopBar
        title={selectedGame?.title ?? null}
        platformBadge={selectedGame?.platformBadge}
        engine={bundle?.engine}
        hasGame={hasGame}
        isTouch={isTouch}
        barVisible={barVisible}
        showTouchControls={showTouchControls}
        controlProfile={controlProfile}
        isMuted={isMuted}
        gamepadConnected={gamepadConnected}
        hasSavedState={hasSavedState}
        onRevealBar={revealBar}
        onToggleTouchControls={toggleTouchControls}
        onCycleControlProfile={cycleControlProfile}
        onToggleMute={toggleMute}
        onSaveState={() => saveSnapshot(activeControllerRef.current?.saveState)}
        onLoadState={() => loadSnapshot(activeControllerRef.current?.loadState)}
        onReload={handleReload}
        onToggleFullscreen={toggleSmartFullscreen}
        onBack={onBack}
      />

      <div className="nl-screen" ref={screenRef}>
        {!hasGame && (
          <div className="nl-screen-idle">
            <span className="nl-screen-logo" aria-hidden="true" />
            <p className="nl-screen-hint">{t('games.idle')}</p>
          </div>
        )}

        {hasGame && resolvingBundle && (
          <div className="nl-screen-overlay">
            {selectedGame?.posterUrl && (
              <img
                className="nl-screen-poster"
                src={selectedGame.posterUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="nl-progress">
              <span />
            </div>
            <p className="nl-screen-hint">{t('games.loading')}</p>
          </div>
        )}

        {hasGame && resolveError && (
          <div className="nl-screen-overlay">
            <p className="nl-screen-hint">{resolveError}</p>
            <button
              type="button"
              className="nl-screen-btn"
              onClick={handleReload}
            >
              <RotateCcw size={16} aria-hidden="true" /> {t('games.errorRetry')}
            </button>
          </div>
        )}

        {hasGame && !resolvingBundle && !resolveError && bundle && (
          <>
            {bundle.engine === 'ruffle' && (
              <RuffleEngineView
                swfUrl={bundle.playableUrl}
                posterUrl={selectedGame?.posterUrl ?? null}
                reloadToken={reloadToken}
                onRetry={handleReload}
                onReadyStateChange={setEngineReady}
                onTargetElementChange={handleTargetElementChange}
                registerController={registerController}
              />
            )}

            {bundle.engine === 'nostalgist' && (
              <RetroConsoleEngineView
                romUrl={bundle.playableUrl}
                core={bundle.consoleCore || 'gambatte'}
                posterUrl={selectedGame?.posterUrl ?? null}
                reloadToken={reloadToken}
                onRetry={handleReload}
                onReadyStateChange={setEngineReady}
                onTargetElementChange={handleTargetElementChange}
                registerController={registerController}
              />
            )}

            {bundle.engine === 'js-dos' && (
              <DosEngineView
                bundleUrl={bundle.playableUrl}
                posterUrl={selectedGame?.posterUrl ?? null}
                reloadToken={reloadToken}
                onRetry={handleReload}
                onReadyStateChange={setEngineReady}
                onTargetElementChange={handleTargetElementChange}
                registerController={registerController}
              />
            )}

            {bundle.engine === 'html5' && (
              <Html5EmbedEngineView
                embedUrl={bundle.playableUrl}
                title={selectedGame?.title ?? null}
                reloadToken={reloadToken}
                onReadyStateChange={setEngineReady}
              />
            )}

            {bundle.engine === 'mini-api' && (
              <MiniGamesNativeView
                kind={bundle.miniGameKind || 'lichess-daily'}
                onReadyStateChange={setEngineReady}
              />
            )}
          </>
        )}

        {isTouch && hasGame && showTouchControls && engineReady && (
          <TouchControls
            playerRef={targetElementRef}
            profile={controlProfile}
          />
        )}
      </div>

      <MobileLandscapePrompt
        isTouch={isTouch}
        hasGame={hasGame}
        noticeDismissed={noticeDismissed}
        onDismissNotice={() => setNoticeDismissed(true)}
        noticeText={t('games.desktopNotice')}
        saveToast={saveToast}
      />
    </div>
  );
}
