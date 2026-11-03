import React, { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Play, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';

export interface PlaySource {
  id: string;
  label: string;
  host: string;
  url: string;
}

export interface CinemaWatchTarget {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  imdbId?: string;
  backdropPath?: string;
  posterPath?: string;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMDB_MEMORY_CACHE: Record<string, string> = {};

export const TIP_BG_URL =
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/tip.webp';

// Exact literal text requested by the user — do NOT modify a single character
export const EXACT_TIP_MESSAGE =
  ' جرب  سيرفرفات بعض المرات قدر ميكونش واحد فيهم خدام  و من الافضل تفرج ب متصفح brave باش  تمنع كل الاعلانات تلقائيا ';

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

  const rawUrls = [
    { host: 'streamimdb.ru', url: `https://streamimdb.ru/embed/${type}/${imdbId}` },
    { host: 'player.imdb.su', url: `https://player.imdb.su/embed/${type}/${imdbId}` },
    { host: '2embed.cc', url: twoEmbedUrl },
    { host: 'multiembed.mov', url: `https://multiembed.mov/?video_id=${imdbId}` },
    { host: 'vidsrc.icu', url: `https://vidsrc.icu/embed/${type}/${imdbId}` },
    { host: 'vidsrc.xyz', url: `https://vidsrc.xyz/embed/${type}/${imdbId}` },
    { host: 'autoembed.co', url: autoEmbedUrl },
  ];

  return rawUrls.map((entry, idx) => ({
    id: `server-${idx + 1}`,
    label: `Server ${idx + 1}`,
    host: entry.host,
    url: entry.url,
  }));
}

export function useResolvedImdbSources(
  item: CinemaWatchTarget | null,
  enabled: boolean,
) {
  const [resolvedImdbId, setResolvedImdbId] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !item) {
      setResolvedImdbId('');
      setResolving(false);
      return;
    }

    const direct = extractImdbId(item.imdbId);
    if (direct) {
      setResolvedImdbId(direct);
      setResolving(false);
      return;
    }

    const cacheKey = `${item.mediaType}_${item.id}`;
    if (IMDB_MEMORY_CACHE[cacheKey]) {
      setResolvedImdbId(IMDB_MEMORY_CACHE[cacheKey]);
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);
    const tmdbKey = import.meta.env.VITE_TMDB_API_KEY || PUBLIC_TMDB_KEY;

    const resolveRemote = async () => {
      try {
        if (!tmdbKey) {
          if (!cancelled) setResolving(false);
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
        if (found) {
          IMDB_MEMORY_CACHE[cacheKey] = found;
        }
        if (!cancelled) {
          setResolvedImdbId(found);
        }
      } catch {
        if (!cancelled) setResolvedImdbId('');
      } finally {
        if (!cancelled) setResolving(false);
      }
    };

    void resolveRemote();
    return () => {
      cancelled = true;
    };
  }, [enabled, item]);

  const sources = useMemo(() => {
    if (!item) return [];
    return buildSources({
      mediaType: item.mediaType,
      imdbId: resolvedImdbId || item.imdbId,
    });
  }, [item, resolvedImdbId]);

  return { sources, resolving };
}

/**
 * Floating Smart Liquid Glass TIP Card with Karaoke / Typewriter Reveal
 * Background: https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/tip.webp
 * Text color: #000000 with strong red glow
 */
export const FloatingGlassTipCard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}> = ({ isOpen, onClose, className = '' }) => {
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTypedCount(0);
      return undefined;
    }

    setTypedCount(0);
    const totalLength = EXACT_TIP_MESSAGE.length;
    const interval = setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= totalLength) {
          clearInterval(interval);
          return totalLength;
        }
        return prev + 1;
      });
    }, 34);

    return () => clearInterval(interval);
  }, [isOpen]);

  const visibleText = EXACT_TIP_MESSAGE.slice(0, typedCount);
  const remainingText = EXACT_TIP_MESSAGE.slice(typedCount);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.92 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`lg-cinema-tip-card relative overflow-hidden rounded-2xl select-none ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Image Layer */}
          <div
            className="lg-cinema-tip-card__bg"
            style={{ backgroundImage: `url(${TIP_BG_URL})` }}
            aria-hidden="true"
          />

          {/* Liquid Glass Specular Rim & Subtle Frosted Overlay */}
          <div className="lg-cinema-tip-card__sheen" aria-hidden="true" />

          <div className="relative z-10 p-3.5 sm:p-4 flex flex-col gap-2">
            {/* Top Bar: English TIP Badge + Dismiss X Button */}
            <div className="flex items-center justify-between gap-2" dir="ltr">
              <span className="lg-cinema-tip-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={11} className="text-red-500 animate-pulse" />
                <span>TIP</span>
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="lg-cinema-tip-close w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                aria-label="Close Tip"
                title="Close Tip"
              >
                <X size={13} strokeWidth={2.6} />
              </button>
            </div>

            {/* Karaoke / Typewriter Message in Black with Red Glow */}
            <p
              dir="rtl"
              className="lg-cinema-tip-text text-xs sm:text-[13.5px] font-black leading-relaxed text-right"
            >
              <span>{visibleText}</span>
              {typedCount < EXACT_TIP_MESSAGE.length && (
                <span
                  className="inline-block w-1.5 h-3.5 ms-0.5 align-middle bg-black rounded-sm animate-pulse"
                  style={{
                    boxShadow: '0 0 8px #ff0022, 0 0 14px #ff1e38',
                  }}
                />
              )}
              <span className="opacity-0 pointer-events-none select-none">
                {remainingText}
              </span>
            </p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Smooth Branching Liquid Glass Server Capsules + Auto-Opening Smart TIP Window
 * Used directly inside Hero Banner and Details Modal when clicking Watch Now
 */
export const ServerBranchesInline: React.FC<{
  item: CinemaWatchTarget;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  buttonLabel: string;
  align?: 'start' | 'center';
}> = ({ item, isOpen, onToggle, onClose, buttonLabel, align = 'start' }) => {
  const { sources, resolving } = useResolvedImdbSources(item, true);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowTip(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setShowTip(true);
    }, 160);
    return () => clearTimeout(timer);
  }, [isOpen, item.id]);

  return (
    <div
      className={`relative flex flex-col gap-2.5 ${
        align === 'center' ? 'items-center' : 'items-start'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Main Watch Now Trigger Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={isOpen}
          className={`lg-cinema-primary-pill py-2.5 px-6 text-white font-black flex items-center gap-2 text-xs sm:text-sm cursor-pointer ${
            isOpen ? 'ring-2 ring-white/60' : ''
          }`}
        >
          <Play size={15} className="fill-current" />
          <span>{buttonLabel}</span>
        </button>

        {/* Smoothly Branching Liquid Glass Server Capsules (Server 1, Server 2...) */}
        <AnimatePresence>
          {isOpen && (
            <m.div
              initial={{ opacity: 0, scale: 0.92, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.92, x: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center gap-2"
              dir="ltr"
            >
              {resolving && sources.length === 0 ? (
                <span className="lg-server-branch-pill px-3.5 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-rose-300" />
                  <span className="lg-server-glow-text">Loading...</span>
                </span>
              ) : (
                sources.map((src, idx) => (
                  <m.a
                    key={src.id}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.8, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 4 }}
                    transition={{
                      duration: 0.2,
                      delay: idx * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="lg-server-branch-pill px-3.5 py-2 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer no-underline"
                    title={`${src.label} (${src.host})`}
                  >
                    <Play size={11} className="fill-current text-rose-400 shrink-0" />
                    <span className="lg-server-glow-text">{src.label}</span>
                    <ExternalLink size={10} className="opacity-70 shrink-0" />
                  </m.a>
                ))
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px]"
                aria-label="Close servers"
                title="Close"
              >
                <X size={13} />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart Floating Liquid Glass TIP Window */}
      <FloatingGlassTipCard
        isOpen={isOpen && showTip}
        onClose={() => setShowTip(false)}
        className="w-full max-w-[430px] mt-0.5"
      />
    </div>
  );
};

/**
 * Floating Popover for Quick-Watch on Poster Cards (No Iframe — Direct Branching Server Capsules + TIP Card)
 */
interface MovieSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CinemaWatchTarget | null;
}

export const MovieSourcesModal: React.FC<MovieSourcesModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { sources, resolving } = useResolvedImdbSources(item, isOpen);
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setShowTip(true);
    }
  }, [isOpen, item?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10200] flex items-center justify-center p-4 select-none">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-md cursor-default"
            onClick={onClose}
          />

          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[480px] flex flex-col items-center gap-3.5"
          >
            {/* Floating Branching Capsules Container */}
            <div className="lg-cinema-glass-modal w-full rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2" dir="ltr">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="lg-cinema-badge-dot shrink-0">
                    <Play size={12} className="fill-current" />
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white truncate">
                    {item.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="lg-cinema-icon-pill !w-8 !h-8 !min-w-[32px] !min-h-[32px] hover:!bg-rose-600/45"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Branching Server Capsules */}
              <div
                className="flex flex-wrap items-center justify-center gap-2.5 py-1"
                dir="ltr"
              >
                {resolving && sources.length === 0 ? (
                  <div className="py-4 flex items-center gap-2 text-white/85 text-xs font-bold">
                    <RefreshCw size={16} className="animate-spin text-rose-400" />
                    <span className="lg-server-glow-text">Loading Servers...</span>
                  </div>
                ) : (
                  sources.map((src, idx) => (
                    <m.a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.84, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: idx * 0.04,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="lg-server-branch-pill px-4 py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer no-underline"
                    >
                      <Play size={12} className="fill-current text-rose-400 shrink-0" />
                      <span className="lg-server-glow-text">{src.label}</span>
                      <ExternalLink size={11} className="opacity-75 shrink-0" />
                    </m.a>
                  ))
                )}
              </div>
            </div>

            {/* Smart Floating Liquid Glass TIP Window right below the server branches */}
            <FloatingGlassTipCard
              isOpen={showTip}
              onClose={() => setShowTip(false)}
              className="w-full"
            />
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
