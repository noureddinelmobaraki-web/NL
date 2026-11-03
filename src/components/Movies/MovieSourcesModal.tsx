import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  AlertCircle,
  Play,
  Server,
  RefreshCw,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';

export interface PlaySource {
  name: string;
  host: string;
  url: string;
  embedCapable?: boolean;
}

export interface CinemaItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  imdbId?: string;
  backdropPath?: string;
  posterPath?: string;
}

export function extractImdbId(imdbId?: string): string {
  if (!imdbId) return '';
  const match = imdbId.match(/(tt\d+)/);
  return match ? match[1] : imdbId.trim();
}

export function buildSources(item: {
  mediaType: 'movie' | 'tv';
  imdbId?: string;
}): PlaySource[] {
  const imdbId = extractImdbId(item.imdbId);
  if (!imdbId) return [];
  const type = item.mediaType === 'movie' ? 'movie' : 'tv';
  return [
    {
      name: 'StreamIMDb',
      host: 'streamimdb.ru',
      url: `https://streamimdb.ru/embed/${type}/${imdbId}`,
      embedCapable: true,
    },
    {
      name: 'IMDb.su',
      host: 'player.imdb.su',
      url: `https://player.imdb.su/embed/${type}/${imdbId}`,
      embedCapable: true,
    },
    {
      name: 'PlayIMDb',
      host: 'playimdb.com',
      url: `https://www.playimdb.com/title/${imdbId}/`,
      embedCapable: false,
    },
  ];
}

interface MovieSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CinemaItem | null;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const MovieSourcesModal: React.FC<MovieSourcesModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const probeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resolvedImdbId, setResolvedImdbId] = useState<string>('');
  const [resolvingImdb, setResolvingImdb] = useState<boolean>(false);

  // 'player' = in-app 16:9 iframe player | 'fallback' = 3-source external tab selector
  const [viewMode, setViewMode] = useState<'player' | 'fallback'>('player');
  const [activeSourceIndex, setActiveSourceIndex] = useState<number>(0);
  const [probingStatus, setProbingStatus] = useState<'probing' | 'ready' | 'failed'>('probing');
  const [failedIndices, setFailedIndices] = useState<number[]>([]);

  // Restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Resolve imdbId automatically if missing on item (e.g., when Watch Now clicked from Hero)
  useEffect(() => {
    if (!isOpen || !item) {
      setResolvedImdbId('');
      setResolvingImdb(false);
      return;
    }

    const direct = extractImdbId(item.imdbId);
    if (direct) {
      setResolvedImdbId(direct);
      setResolvingImdb(false);
      return;
    }

    let cancelled = false;
    setResolvingImdb(true);
    const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;

    const resolveRemoteImdb = async () => {
      try {
        if (!tmdbKey) {
          if (!cancelled) setResolvingImdb(false);
          return;
        }
        const endpoint =
          item.mediaType === 'tv'
            ? `${TMDB_BASE_URL}/tv/${item.id}/external_ids?api_key=${tmdbKey}`
            : `${TMDB_BASE_URL}/movie/${item.id}?api_key=${tmdbKey}&append_to_response=external_ids`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to resolve IMDb ID');
        const data = await res.json();
        const found = extractImdbId(
          data?.imdb_id || data?.external_ids?.imdb_id || '',
        );
        if (!cancelled) {
          setResolvedImdbId(found);
        }
      } catch {
        if (!cancelled) setResolvedImdbId('');
      } finally {
        if (!cancelled) setResolvingImdb(false);
      }
    };

    void resolveRemoteImdb();
    return () => {
      cancelled = true;
    };
  }, [isOpen, item]);

  const sources = useMemo(() => {
    if (!item) return [];
    return buildSources({
      mediaType: item.mediaType,
      imdbId: resolvedImdbId || item.imdbId,
    });
  }, [item, resolvedImdbId]);

  const hasImdb = sources.length > 0;
  const currentSource = sources[activeSourceIndex] ?? sources[0] ?? null;

  // Reset and start sequential 3-source probing when modal opens or item changes
  useEffect(() => {
    if (!isOpen || !hasImdb) return;
    setViewMode('player');
    setActiveSourceIndex(0);
    setFailedIndices([]);
    setProbingStatus('probing');
  }, [isOpen, hasImdb, resolvedImdbId]);

  // Sequential probing logic: test current source, advance if it fails/times out,
  // and switch to fallback screen if all 3 fail to embed.
  const advanceToNextSourceOrFallback = useCallback(
    (failedIdx: number) => {
      setFailedIndices((prev) =>
        prev.includes(failedIdx) ? prev : [...prev, failedIdx],
      );

      const nextIdx = failedIdx + 1;
      if (nextIdx < sources.length) {
        setActiveSourceIndex(nextIdx);
        setProbingStatus('probing');
      } else {
        setProbingStatus('failed');
        setViewMode('fallback');
      }
    },
    [sources.length],
  );

  useEffect(() => {
    if (!isOpen || viewMode !== 'player' || !currentSource) return undefined;

    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current);
    }

    // PlayIMDb (/title/tt...) often blocks iframe X-Frame-Options; if reached during auto-probe,
    // give it a fast check and if it cannot embed, show fallback selector.
    const timeoutMs = currentSource.url.includes('/embed/') ? 6500 : 2800;

    probeTimerRef.current = setTimeout(() => {
      setProbingStatus((curr) => {
        if (curr === 'probing') {
          // If still probing after timeout on non-embed URL, move to next or fallback
          if (!currentSource.url.includes('/embed/')) {
            advanceToNextSourceOrFallback(activeSourceIndex);
          } else {
            return 'ready';
          }
        }
        return curr;
      });
    }, timeoutMs);

    return () => {
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current);
      }
    };
  }, [
    isOpen,
    viewMode,
    currentSource,
    activeSourceIndex,
    advanceToNextSourceOrFallback,
  ]);

  const handleIframeLoad = useCallback(() => {
    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current);
    }
    // Non-embed PlayIMDb URLs refuse X-Frame-Options in many browsers (loading an empty error frame).
    // If all /embed/ sources failed and we landed on non-embed, offer fallback if needed.
    setProbingStatus('ready');
  }, []);

  const handleIframeError = useCallback(() => {
    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current);
    }
    advanceToNextSourceOrFallback(activeSourceIndex);
  }, [activeSourceIndex, advanceToNextSourceOrFallback]);

  const handleSelectServer = useCallback((idx: number) => {
    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current);
    }
    setActiveSourceIndex(idx);
    setViewMode('player');
    setProbingStatus('probing');
  }, []);

  // Escape key & focus trap
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!item) return null;

  const handleOpenExternal = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="lg-cinema-stream-overlay fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 select-none">
          {/* Translucent Liquid Glass Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-xl cursor-default"
            onClick={onClose}
          />

          <m.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`lg-cinema-glass-modal relative z-10 w-full ${
              viewMode === 'player' && hasImdb
                ? 'max-w-[940px]'
                : 'max-w-[460px]'
            } rounded-3xl overflow-hidden flex flex-col`}
            dir="rtl"
          >
            {/* ── Top Liquid Glass Control Bar ──────────────────────────── */}
            <div className="lg-cinema-modal-header flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 border-b border-white/15">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="lg-cinema-badge-dot" aria-hidden="true">
                  <Play size={12} className="fill-current" />
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {item.title}
                </h3>
              </div>

              {/* Server Switcher Pills + External Tab Button + Fallback Toggle */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {hasImdb && (
                  <>
                    <div
                      className="lg-cinema-pill-group flex items-center gap-1 p-1 rounded-full"
                      role="tablist"
                      aria-label="تبديل السيرفر"
                    >
                      {sources.map((src, idx) => {
                        const isActive =
                          viewMode === 'player' && activeSourceIndex === idx;
                        const isFailed = failedIndices.includes(idx);
                        return (
                          <button
                            key={src.name}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => handleSelectServer(idx)}
                            className={`lg-cinema-server-tab px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isActive
                                ? 'lg-cinema-server-tab--active text-white'
                                : isFailed
                                  ? 'text-red-300/75 hover:text-white'
                                  : 'text-white/75 hover:text-white'
                            }`}
                          >
                            <Server size={11} />
                            <span>{src.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {currentSource && (
                      <button
                        type="button"
                        onClick={() => handleOpenExternal(currentSource.url)}
                        className="lg-cinema-action-pill px-3 py-1.5 rounded-full text-[11px] font-bold text-white/90 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        title="فتح السيرفر الحالي في نافذة جديدة"
                      >
                        <ExternalLink size={12} />
                        <span className="hidden sm:inline">فتح خارجي</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setViewMode((m) =>
                          m === 'player' ? 'fallback' : 'player',
                        )
                      }
                      className={`lg-cinema-action-pill px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                        viewMode === 'fallback'
                          ? 'bg-white/25 text-white'
                          : 'text-white/85 hover:text-white'
                      }`}
                      title="عرض قائمة المصادر الثلاثة"
                    >
                      <Layers size={12} />
                      <span>
                        {viewMode === 'player' ? 'المصادر (3)' : 'عودة للمشغل'}
                      </span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="lg-cinema-icon-pill w-8 h-8 rounded-full flex items-center justify-center text-white/85 hover:text-white cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Body: Resolving / In-App 16:9 Embed Player / External Fallback ── */}
            <div className="p-3 sm:p-5 flex flex-col items-center justify-center">
              {resolvingImdb ? (
                <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-white/80">
                  <RefreshCw size={28} className="animate-spin text-sky-400" />
                  <p className="text-xs sm:text-sm font-bold">
                    جاري تحضير روابط البث المباشر...
                  </p>
                </div>
              ) : !hasImdb ? (
                <div className="w-full flex flex-col items-center justify-center p-8 rounded-2xl bg-red-950/30 border border-red-400/30 text-center gap-3">
                  <AlertCircle className="text-red-400" size={34} />
                  <p className="text-sm font-bold text-red-200">
                    لا يتوفر معرف IMDb لهذا العمل حالياً
                  </p>
                </div>
              ) : viewMode === 'player' && currentSource ? (
                <div className="w-full flex flex-col items-center gap-3">
                  {/* Direct 16:9 Responsive Embed Container (exact specification) */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '900px',
                      aspectRatio: '16 / 9',
                      background: '#000',
                      borderRadius: '16px',
                      overflow: 'hidden',
                    }}
                    className="lg-cinema-embed-box shadow-2xl"
                  >
                    {probingStatus === 'probing' && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-black/75 backdrop-blur-md text-white pointer-events-none">
                        <RefreshCw
                          size={26}
                          className="animate-spin text-sky-300"
                        />
                        <span className="text-xs font-bold tracking-wide text-white/90">
                          جاري اختبار وتوصيل سيرفر {currentSource.name}...
                        </span>
                      </div>
                    )}

                    <iframe
                      key={currentSource.url}
                      src={currentSource.url}
                      title={`${item.title} - ${currentSource.name}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                      }}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="origin"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                    />
                  </div>

                  {/* Helper bar beneath player for instant fallback if provider forces external visit */}
                  <div className="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 px-2 pt-1 text-[11px] text-white/75">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>
                        السيرفر النشط: <strong className="text-white">{currentSource.name}</strong> ({currentSource.host})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {sources.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            advanceToNextSourceOrFallback(activeSourceIndex)
                          }
                          className="text-sky-300 hover:text-sky-200 font-bold underline underline-offset-4 cursor-pointer"
                        >
                          جرب السيرفر التالي ↻
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setViewMode('fallback')}
                        className="text-amber-300 hover:text-amber-200 font-bold underline underline-offset-4 cursor-pointer"
                      >
                        رفض السيرفر التضمين؟ افتح شاشة المصادر الخارجية ↗
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Fallback Screen: 3 Sources External Selector ──────────── */
                <div className="w-full flex flex-col gap-3.5 py-1">
                  <p className="text-xs text-white/80 leading-relaxed text-center font-semibold">
                    اختر أحد السيرفرات الثلاثة لفتح المشاهدة مباشرة في نافذة جديدة أو إعادة المحاولة داخل المشغل المدمج:
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {sources.map((source, idx) => (
                      <div
                        key={source.name}
                        className="lg-cinema-source-row flex items-center justify-between gap-2 p-3.5 rounded-2xl transition-all"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">
                              {source.name}
                            </span>
                            <span className="text-[11px] text-white/65 font-mono">
                              ({source.host})
                            </span>
                          </div>
                          <span
                            className="text-[10px] text-white/50 font-mono truncate mt-0.5 text-left"
                            dir="ltr"
                          >
                            {source.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectServer(idx)}
                            className="lg-cinema-action-pill px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Play size={12} className="fill-current" />
                            <span>تشغيل مدمج</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenExternal(source.url)}
                            className="lg-cinema-primary-pill px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>فتح</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
