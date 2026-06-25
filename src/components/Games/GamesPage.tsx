import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useAppContext } from '../../context/AppContext';
import { GameScreen } from './GameScreen';
import { useGamesMusic } from './useGamesMusic';
import { GAMES_BG_VIDEO } from '../../constants/assets';
import './games.css';

const GAMES_BASE = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/games';

interface GameEntry { id: string; title: string; dir: string; swf: string; poster: string; }
interface GamesPageProps { onClose: () => void; }

const buildUrl = (dir: string, file: string) =>
  `${GAMES_BASE}/${encodeURIComponent(dir)}/${encodeURIComponent(file)}`;

export function GamesPage({ onClose }: GamesPageProps) {
  const { t } = useTranslation();
  const { isMobile, isTablet } = useDeviceType();
  const { setGameActive, registerGameBack } = useAppContext();
  const isTouch = isMobile || isTablet;

  const [games, setGames] = useState<GameEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // موسيقى الوضع: تتوقف عند تشغيل لعبة وتستأنف عند الرجوع للقائمة
  useGamesMusic(Boolean(selectedId));

  // أبلغ Context + اسجّل callback العودة للقائمة
  useEffect(() => {
    setGameActive(Boolean(selectedId));
    registerGameBack(() => setSelectedId(null));
  }, [selectedId, setGameActive, registerGameBack]);

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

  // تحميل قائمة الألعاب
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/games.json`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const parsedGames = Array.isArray(d?.games)
          ? d.games.filter((g: any) => g && g.id && g.title && g.dir && g.swf && g.poster)
          : [];
        if (!parsedGames.length) {
          console.warn('[games] بيانات غير صالحة أو فارغة');
        }
        setGames(parsedGames);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Esc: رجوع من لعبة → قائمة، أو إغلاق الصفحة
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Escape' || document.fullscreenElement) return;
    if (isTouch && selectedId) setSelectedId(null);
    else onClose();
  }, [onClose, isTouch, selectedId]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const selected = useMemo(
    () => games.find((g) => g.id === selectedId) ?? null,
    [games, selectedId],
  );
  const swfUrl   = selected ? buildUrl(selected.dir, selected.swf)    : null;
  const posterUrl = selected ? buildUrl(selected.dir, selected.poster) : null;

  const bgVideo = (
    <video
      className="nl-games-video"
      src={GAMES_BG_VIDEO}
      autoPlay loop muted playsInline preload="auto"
      aria-hidden="true" tabIndex={-1}
    />
  );

  const list = (
    <aside className="nl-games-sidebar" aria-label={t('games.title')}>
      <div className="nl-sidebar-heading">{t('games.subtitle')}</div>
      <ul className="nl-game-list">
        {games.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className={`nl-game-item${g.id === selectedId ? ' is-selected' : ''}`}
              aria-current={g.id === selectedId ? 'true' : undefined}
              onClick={() => setSelectedId(g.id)}
            >
              <img className="nl-game-thumb" src={buildUrl(g.dir, g.poster)}
                alt="" loading="lazy" decoding="async" draggable={false} />
              <span className="nl-game-name">{g.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );

  // ── هاتف: قائمة كاملة → لعبة كاملة ─────────────────────────────
  if (isTouch) {
    return createPortal(
      <div className="nl-games-root is-touch pointer-events-auto" dir="ltr" role="dialog" aria-modal="true" aria-label={t('games.title')}>
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
                <button type="button" className="nl-games-close" onClick={onClose} aria-label="Close">
                  <X size={18} aria-hidden="true" />
                </button>
              </header>
              <div className="nl-games-body nl-games-body--list">{list}</div>
            </>
          ) : (
            <main className="nl-games-main nl-games-main--full">
              <GameScreen
                swfUrl={swfUrl} posterUrl={posterUrl}
                title={selected?.title ?? null}
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
    <div className="nl-games-root pointer-events-auto" dir="ltr" role="dialog" aria-modal="true" aria-label={t('games.title')}>
      {bgVideo}
      <div className="nl-games-backdrop" aria-hidden="true" />
      <div className="nl-games-window">
        <header className="nl-games-titlebar">
          <div className="nl-games-brand">
            <span className="nl-games-logo" aria-hidden="true" />
            <span className="nl-games-title">{t('games.title')}</span>
          </div>
          <button type="button" className="nl-games-close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="nl-games-body">
          {list}
          <main className="nl-games-main">
            <GameScreen
              swfUrl={swfUrl} posterUrl={posterUrl}
              title={selected?.title ?? null}
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
