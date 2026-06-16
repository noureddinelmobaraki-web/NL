import { useRef, useState, useCallback, useEffect } from 'react';
import { Maximize, Gamepad2, RotateCcw, ChevronLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRuffle } from './useRuffle';
import { TouchControls } from './TouchControls';

interface GameScreenProps {
  swfUrl: string | null;
  posterUrl: string | null;
  title: string | null;
  isTouch: boolean;
  /** العودة لقائمة الألعاب (إغلاق اللعبة فقط) */
  onBack?: () => void;
  /** إغلاق صفحة الألعاب بالكامل */
  onClose?: () => void;
}

const BAR_HIDE_MS = 7000;

export function GameScreen({
  swfUrl, posterUrl, title, isTouch, onBack, onClose,
}: GameScreenProps) {
  const { t } = useTranslation();
  const screenRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { status, playerRef } = useRuffle(containerRef, swfUrl, reloadToken);
  const [showControls, setShowControls]       = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [barVisible, setBarVisible]           = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasGame = !!swfUrl;

  useEffect(() => {
    if (status === 'ready' && isTouch) setShowControls(true);
  }, [status, isTouch]);

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
    if (!isTouch) { setBarVisible(true); return; }
    setBarVisible(true);
    armHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [isTouch, swfUrl, armHideTimer]);

  const toggleFullscreen = useCallback(() => {
    const el = screenRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => {
        try { (screen.orientation as any)?.lock?.('landscape'); } catch {};
      }).catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  return (
    <div className={`nl-screen-wrap${isTouch ? ' is-touch' : ''}`}>
      {/* منطقة لمس علوية لإعادة إظهار الشريط في الهاتف */}
      {isTouch && !barVisible && (
        <button type="button" className="nl-screen-reveal"
          aria-label={t('games.controls')} onClick={revealBar} />
      )}

      <div className={`nl-screen-bar${isTouch ? ' is-floating' : ''}${barVisible ? '' : ' is-hidden'}`}>
        <div className="nl-screen-bar-left">
          <span className="nl-screen-title">{title ?? t('games.idle')}</span>
        </div>

        <div className="nl-screen-actions">
          {/* أزرار الهاتف */}
          {isTouch && hasGame && (
            <button type="button" className="nl-screen-btn"
              aria-pressed={showControls}
              onClick={() => { revealBar(); setShowControls((v) => !v); }}
              aria-label={t('games.controls')}>
              <Gamepad2 size={16} aria-hidden="true" />
            </button>
          )}
          {hasGame && (
            <button type="button" className="nl-screen-btn"
              onClick={() => { revealBar(); toggleFullscreen(); }}
              aria-label={t('games.fullscreen')}>
              <Maximize size={16} aria-hidden="true" />
            </button>
          )}
          {/* ✕ زر إغلاق اللعبة — يرجع للقائمة فقط ولا يغلق الصفحة */}
          {onBack && hasGame && (
            <button type="button" className="nl-screen-btn nl-screen-btn--ghost nl-screen-btn--close"
              onClick={() => { revealBar(); onBack(); }}
              aria-label="Close game">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="nl-screen" ref={screenRef}>
        <div className="nl-ruffle-host" ref={containerRef} />

        {!hasGame && (
          <div className="nl-screen-idle">
            <span className="nl-screen-logo" aria-hidden="true" />
            <p className="nl-screen-hint">{t('games.idle')}</p>
          </div>
        )}

        {hasGame && status === 'loading' && (
          <div className="nl-screen-overlay">
            {posterUrl && (
              <img className="nl-screen-poster" src={posterUrl} alt="" aria-hidden="true" />
            )}
            <div className="nl-progress"><span /></div>
            <p className="nl-screen-hint">{t('games.loading')}</p>
          </div>
        )}

        {hasGame && status === 'error' && (
          <div className="nl-screen-overlay">
            <p className="nl-screen-hint">{t('games.error')}</p>
            <button type="button" className="nl-screen-btn"
              onClick={() => setReloadToken((x) => x + 1)}>
              <RotateCcw size={16} aria-hidden="true" /> {t('games.errorRetry')}
            </button>
          </div>
        )}

        {isTouch && hasGame && showControls && status === 'ready' && (
          <TouchControls playerRef={playerRef} />
        )}
      </div>

      {isTouch && hasGame && !noticeDismissed && (
        <div className="nl-desktop-notice">
          <span>{t('games.desktopNotice')}</span>
          <button type="button" onClick={() => setNoticeDismissed(true)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}
