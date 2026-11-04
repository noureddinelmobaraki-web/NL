import React, { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Play, Sparkles } from 'lucide-react';
import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';
import {
  CINEMA_SERVERS,
  extractValidImdbId,
} from '../../config/servers';

export interface PlaySource {
  id: string;
  label: string;
  host: string;
  url: string;
  origins: string[];
  timeoutMs: number;
}

export interface CinemaWatchTarget {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  imdbId?: string;
  backdropPath?: string;
  posterPath?: string;
  season?: number;
  episode?: number;
  fullSeason?: boolean;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMDB_MEMORY_CACHE: Record<string, string> = {};

export const TIP_BG_URL =
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/tip.webp';

// Exact literal text requested by the user — do NOT modify a single character
export const EXACT_TIP_MESSAGE =
  ' جرب  سيرفرفات بعض المرات قدر ميكونش واحد فيهم خدام  و من الافضل تفرج ب متصفح brave باش  تمنع كل الاعلانات تلقائيا ';

export function extractImdbId(imdbId?: string): string {
  return extractValidImdbId(imdbId);
}

export function buildSources(item: {
  id?: number;
  mediaType: 'movie' | 'tv';
  imdbId?: string;
  season?: number;
  episode?: number;
  fullSeason?: boolean;
}): PlaySource[] {
  const ids = {
    imdb: item.imdbId,
    tmdb: item.id,
  };
  const s = Math.max(1, item.season || 1);
  const e = Math.max(1, item.episode || 1);
  const isFullSeason = Boolean(item.fullSeason);

  return CINEMA_SERVERS.map((server) => {
    const url =
      item.mediaType === 'movie'
        ? server.movie(ids)
        : server.tv(ids, s, e, isFullSeason);
    return {
      id: server.id,
      label: server.label,
      host: server.host,
      url,
      origins: server.origins,
      timeoutMs: server.timeoutMs,
    };
  }).filter((src) => Boolean(src.url));
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
      id: item.id,
      mediaType: item.mediaType,
      imdbId: resolvedImdbId || item.imdbId,
      season: item.season,
      episode: item.episode,
      fullSeason: item.fullSeason,
    });
  }, [item, resolvedImdbId]);

  return { sources, resolving, resolvedImdbId: resolvedImdbId || extractImdbId(item?.imdbId) };
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
 * Direct Watch Now Trigger + Auto-Opening Smart TIP Window
 * Server selection buttons are intentionally removed from the UI; background server
 * resolution and smart caching handle playback directly inside the gallery player.
 */
export const ServerBranchesInline: React.FC<{
  item: CinemaWatchTarget;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  buttonLabel: string;
  align?: 'start' | 'center';
  activeServerIdx?: number | null;
  onSelectServer?: (index: number, source: PlaySource) => void;
}> = ({
  item,
  isOpen,
  onToggle,
  buttonLabel,
  align = 'start',
}) => {
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowTip(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setShowTip(true);
    }, 140);
    return () => clearTimeout(timer);
  }, [isOpen, item.id]);

  return (
    <div
      className={`relative flex flex-col gap-2.5 ${
        align === 'center' ? 'items-center' : 'items-start'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Main Watch Now Trigger Button (Starts playback directly in the gallery player) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={isOpen}
          className={`lg-cinema-primary-pill py-2.5 px-6 text-white font-black flex items-center gap-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap ${
            isOpen ? 'ring-2 ring-white/60' : ''
          }`}
        >
          <Play size={15} className="fill-current" />
          <span>{buttonLabel}</span>
        </button>
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
