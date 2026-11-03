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
  PictureInPicture2,
  ShieldCheck,
} from 'lucide-react';
import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';

export interface PlaySource {
  name: string;
  host: string;
  url: string;
  embedCapable?: boolean;
  preferPopup?: boolean;
}

export interface CinemaItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  imdbId?: string;
  backdropPath?: string;
  posterPath?: string;
}

const CF_WORKER_PROXY_BASE = 'https://broad-block-7bd7.nordinegb2018.workers.dev';

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
  const twoEmbedUrl =
    type === 'movie'
      ? `https://www.2embed.cc/embed/${imdbId}`
      : `https://www.2embed.cc/embedtvfull/${imdbId}`;
  const autoEmbedUrl =
    type === 'movie'
      ? `https://autoembed.co/movie/imdb/${imdbId}`
      : `https://autoembed.co/tv/imdb/${imdbId}-1-1`;

  return [
    {
      name: '2Embed',
      host: '2embed.cc',
      url: twoEmbedUrl,
      embedCapable: true,
    },
    {
      name: 'MultiEmbed',
      host: 'multiembed.mov',
      url: `https://multiembed.mov/?video_id=${imdbId}`,
      embedCapable: true,
    },
    {
      name: 'VidSrc ICU',
      host: 'vidsrc.icu',
      url: `https://vidsrc.icu/embed/${type}/${imdbId}`,
      embedCapable: true,
    },
    {
      name: 'VidSrc XYZ',
      host: 'vidsrc.xyz',
      url: `https://vidsrc.xyz/embed/${type}/${imdbId}`,
      embedCapable: true,
    },
    {
      name: 'AutoEmbed',
      host: 'autoembed.co',
      url: autoEmbedUrl,
      embedCapable: true,
    },
    {
      name: 'StreamIMDb',
      host: 'streamimdb.ru',
      url: `https://streamimdb.ru/embed/${type}/${imdbId}`,
      embedCapable: false,
      preferPopup: true,
    },
    {
      name: 'IMDb.su',
      host: 'player.imdb.su',
      url: `https://player.imdb.su/embed/${type}/${imdbId}`,
      embedCapable: false,
      preferPopup: true,
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

  // 'player' = in-app 16:9 iframe player | 'fallback' = all sources & popup selector
  const [viewMode, setViewMode] = useState<'player' | 'fallback'>('player');
  const [activeSourceIndex, setActiveSourceIndex] = useState<number>(0);
  const [probingStatus, setProbingStatus] = useState<'probing' | 'ready' | 'failed'>('probing');
  const [failedIndices, setFailedIndices] = useState<number[]>([]);
  const [useCfProxy, setUseCfProxy] = useState<boolean>(false);

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

  const activeIframeUrl = useMemo(() => {
    if (!currentSource) return '';
    if (useCfProxy) {
      return `${CF_WORKER_PROXY_BASE}/?url=${encodeURIComponent(currentSource.url)}`;
    }
    return currentSource.url;
  }, [currentSource, useCfProxy]);

  // Reset and start sequential probing when modal opens or item changes
  useEffect(() => {
    if (!isOpen || !hasImdb) return;
    setViewMode('player');
    setActiveSourceIndex(0);
    setFailedIndices([]);
    setUseCfProxy(false);
    setProbingStatus('probing');
  }, [isOpen, hasImdb, resolvedImdbId]);

  // Sequential cascade: test current source, advance to next if it fails
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

    const timeoutMs = currentSource.embedCapable !== false ? 5500 : 3200;

    probeTimerRef.current = setTimeout(() => {
      setProbingStatus((curr) => (curr === 'probing' ? 'ready' : curr));
    }, timeoutMs);

    return () => {
      if (probeTimerRef.current) {
        clearTimeout(probeTimerRef.current);
      }
    };
  }, [isOpen, viewMode, currentSource, activeSourceIndex, useCfProxy]);

  const handleIframeLoad = useCallback(() => {
    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current);
    }
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

  // Escape key
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

  const handleOpenExternalTab = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Centered Mini-Player Floating Window (bypasses X-Frame-Options for StreamIMDb / IMDb.su)
  const handleOpenMiniPlayerPopup = (url: string) => {
    handleOpenExternalTab(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="lg-cinema-stream-overlay fixed inset-0 z-[10000] flex items-center justify-center p-2.5 sm:p-5 select-none">
          {/* Translucent Liquid Glass Backdrop */}
          <div
            className="absolute inset-0 bg-black/82 backdrop-blur-xl cursor-default"
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
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={`lg-cinema-glass-modal relative z-10 w-full ${
              viewMode === 'player' && hasImdb
                ? 'max-w-[960px]'
                : 'max-w-[540px]'
            } rounded-3xl overflow-hidden flex flex-col max-h-[94dvh]`}
            dir="rtl"
          >
            {/* ── Top Liquid Glass Control Bar ──────────────────────────── */}
            <div className="lg-cinema-modal-header flex flex-col gap-2.5 px-4 sm:px-6 py-3.5 border-b border-white/15">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="lg-cinema-badge-dot flex-shrink-0" aria-hidden="true">
                    <Play size={12} className="fill-current" />
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  {hasImdb && currentSource && (
                    <>
                      <button
                        type="button"
                        onClick={() => setUseCfProxy((v) => !v)}
                        className={`lg-cinema-action-pill px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                          useCfProxy
                            ? '!bg-emerald-500/30 !border-emerald-300/60 text-emerald-200'
                            : 'text-white/80 hover:text-white'
                        }`}
                        title="تفعيل أو إيقاف بروكسي Cloudflare لتجاوز قيود التضمين"
                      >
                        <ShieldCheck size={12} />
                        <span className="hidden sm:inline">CF Proxy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenMiniPlayerPopup(currentSource.url)}
                        className="lg-cinema-action-pill px-3 py-1.5 text-[11px] font-bold text-white/90 hover:text-white flex items-center gap-1.5 cursor-pointer"
                        title="فتح في نافذة مشغل مستقلة (يتجاوز حظر X-Frame-Options)"
                      >
                        <PictureInPicture2 size={12} />
                        <span className="hidden sm:inline">مشغل مستقل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setViewMode((m) =>
                            m === 'player' ? 'fallback' : 'player',
                          )
                        }
                        className={`lg-cinema-action-pill px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                          viewMode === 'fallback'
                            ? '!bg-white/25 text-white'
                            : 'text-white/85 hover:text-white'
                        }`}
                        title="عرض كافة المصادر والسيرفرات"
                      >
                        <Layers size={12} />
                        <span>
                          {viewMode === 'player'
                            ? `المصادر (${sources.length})`
                            : 'عودة للمشغل'}
                        </span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] hover:!bg-rose-600/45"
                    aria-label="إغلاق"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Server Switcher Pills */}
              {hasImdb && (
                <div
                  className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5"
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
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
                          isActive
                            ? 'lg-cinema-server-tab--active text-white'
                            : isFailed
                              ? 'bg-rose-950/35 border-rose-400/25 text-rose-300/75 hover:text-white'
                              : 'bg-white/8 border-white/15 text-white/75 hover:text-white hover:bg-white/14'
                        }`}
                      >
                        <Server size={11} />
                        <span>{src.name}</span>
                        {src.embedCapable && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="يدعم التضمين المباشر" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Body: Resolving / In-App 16:9 Embed Player / Multi-Source Selector ── */}
            <div className="p-3 sm:p-5 flex flex-col items-center justify-center overflow-y-auto">
              {resolvingImdb ? (
                <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-white/80">
                  <RefreshCw size={28} className="animate-spin text-sky-400" />
                  <p className="text-xs sm:text-sm font-bold">
                    جاري تحضير سيرفرات البث المباشر...
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
                  {/* If user selected StreamIMDb or IMDb.su without CF Proxy, show helpful instant popup banner */}
                  {currentSource.preferPopup && !useCfProxy && (
                    <div className="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-xs text-amber-100">
                      <span>
                        سيرفر <strong>{currentSource.name}</strong> قد يمنع التضمين المباشر في بعض المتصفحات:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUseCfProxy(true)}
                          className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] cursor-pointer"
                        >
                          تجربة عبر CF Proxy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenMiniPlayerPopup(currentSource.url)}
                          className="lg-cinema-primary-pill px-3 py-1 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                        >
                          <span>فتح المشغل المستقل ↗</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Direct 16:9 Responsive Embed Container (No sandbox, referrerPolicy="no-referrer") */}
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
                          جاري تشغيل سيرفر {currentSource.name}...
                        </span>
                      </div>
                    )}

                    <iframe
                      key={activeIframeUrl}
                      src={activeIframeUrl}
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
                      referrerPolicy="no-referrer"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                    />
                  </div>

                  {/* Helper bar beneath player for instant next-server cascade or external open */}
                  <div className="w-full max-w-[900px] flex flex-wrap items-center justify-between gap-2 px-2 pt-1 text-[11px] text-white/80">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>
                        السيرفر النشط ({activeSourceIndex + 1}/{sources.length}):{' '}
                        <strong className="text-white">{currentSource.name}</strong> ({currentSource.host})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {sources.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            advanceToNextSourceOrFallback(activeSourceIndex)
                          }
                          className="lg-cinema-action-pill px-3 py-1 text-[11px] text-sky-200 hover:text-white font-bold cursor-pointer"
                        >
                          جرب السيرفر التالي ↻
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenExternalTab(currentSource.url)}
                        className="text-amber-300 hover:text-amber-200 font-bold underline underline-offset-4 cursor-pointer flex items-center gap-1"
                      >
                        <span>فتح مباشر بدون إطار ↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Fallback Screen: All Sources Selector ──────────── */
                <div className="w-full flex flex-col gap-3 py-1">
                  <p className="text-xs text-white/80 leading-relaxed text-center font-semibold">
                    اختر أي سيرفر للتشغيل المدمج داخل الصفحة أو لفتحه مباشرة:
                  </p>

                  <div className="flex flex-col gap-2">
                    {sources.map((source, idx) => (
                      <div
                        key={source.name}
                        className="lg-cinema-source-row flex items-center justify-between gap-2 p-3 rounded-2xl transition-all"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-white">
                              {idx + 1}. {source.name}
                            </span>
                            <span className="text-[10px] text-white/60 font-mono">
                              ({source.host})
                            </span>
                            {source.embedCapable && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold">
                                تضمين مباشر
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px] text-white/45 font-mono truncate mt-0.5 text-left"
                            dir="ltr"
                          >
                            {source.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectServer(idx)}
                            className="lg-cinema-action-pill px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Play size={11} className="fill-current" />
                            <span>تشغيل مدمج</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenExternalTab(source.url)}
                            className="lg-cinema-primary-pill px-3.5 py-1.5 text-xs font-extrabold text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>فتح خارجي</span>
                            <ExternalLink size={11} />
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
