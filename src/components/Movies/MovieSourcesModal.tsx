import React, { useEffect, useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Play, Sparkles } from 'lucide-react';
import { PUBLIC_TMDB_KEY } from '../../config/publicKeys';
import {
  CINEMA_SERVERS,
  extractValidImdbId,
} from '../../config/servers';
import { sortSourcesBySpeed } from '../../services/serverSpeedMonitor';

export interface PlaySource {
  id: string;
  label: string;
  host: string;
  url: string;
  origins: string[];
  timeoutMs: number;
  capabilities?: {
    timeEvents?: boolean;
    startAt?: boolean;
    workerBridge?: boolean;
  };
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
  startAt?: number;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMDB_MEMORY_CACHE: Record<string, string> = {};

export const TIP_BG_URL =
  'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/tip.webp';

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
  startAt?: number;
}): PlaySource[] {
  const ids = {
    imdb: item.imdbId,
    tmdb: item.id,
  };
  const s = Math.max(1, item.season || 1);
  const e = Math.max(1, item.episode || 1);
  const isFullSeason = Boolean(item.fullSeason);

  const built = CINEMA_SERVERS.map((server) => {
    const url =
      item.mediaType === 'movie'
        ? server.movie(ids, { startAt: item.startAt })
        : server.tv(ids, s, e, isFullSeason, { startAt: item.startAt });
    return {
      id: server.id,
      label: server.label,
      host: server.host,
      url,
      origins: server.origins,
      timeoutMs: server.timeoutMs,
      capabilities: server.capabilities,
    };
  }).filter((src) => Boolean(src.url));

  const titleKey = item.id ? `${item.mediaType}_${item.id}` : undefined;
  return sortSourcesBySpeed(built, titleKey);
}

const IMDB_STORAGE_KEY = 'nl_imdb_id_cache_v1';

function readCachedImdbId(cacheKey: string): string {
  if (IMDB_MEMORY_CACHE[cacheKey]) return IMDB_MEMORY_CACHE[cacheKey];
  try {
    const raw = localStorage.getItem(IMDB_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const val = typeof parsed?.[cacheKey] === 'string' ? extractImdbId(parsed[cacheKey]) : '';
    if (val) IMDB_MEMORY_CACHE[cacheKey] = val;
    return val;
  } catch {
    return '';
  }
}

function writeCachedImdbId(cacheKey: string, imdbId: string): void {
  if (!cacheKey || !imdbId) return;
  IMDB_MEMORY_CACHE[cacheKey] = imdbId;
  try {
    const raw = localStorage.getItem(IMDB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[cacheKey] = imdbId;
    localStorage.setItem(IMDB_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage quota errors
  }
}

export function useResolvedImdbSources(
  item: CinemaWatchTarget | null,
  enabled: boolean,
) {
  const itemId = item?.id;
  const mediaType = item?.mediaType;
  const rawImdbId = item?.imdbId;
  const season = item?.season;
  const episode = item?.episode;
  const fullSeason = item?.fullSeason;
  const startAt = item?.startAt;

  const [resolvedImdbId, setResolvedImdbId] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled || !itemId || !mediaType) {
      setResolvedImdbId('');
      setResolving(false);
      return;
    }

    const cacheKey = `${mediaType}_${itemId}`;
    const direct = extractImdbId(rawImdbId);
    if (direct) {
      writeCachedImdbId(cacheKey, direct);
      setResolvedImdbId(direct);
      setResolving(false);
      return;
    }

    const cached = readCachedImdbId(cacheKey);
    if (cached) {
      setResolvedImdbId(cached);
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
          mediaType === 'tv'
            ? `${TMDB_BASE_URL}/tv/${itemId}/external_ids?api_key=${tmdbKey}`
            : `${TMDB_BASE_URL}/movie/${itemId}/external_ids?api_key=${tmdbKey}`;

        const res = await fetch(endpoint, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) throw new Error('Failed to resolve IMDb ID');
        const data = await res.json();
        const found = extractImdbId(
          data?.imdb_id || data?.external_ids?.imdb_id || '',
        );
        if (found) {
          writeCachedImdbId(cacheKey, found);
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
  }, [enabled, itemId, mediaType, rawImdbId]);

  const effectiveImdbId = resolvedImdbId || extractImdbId(rawImdbId);

  const sources = useMemo(() => {
    if (!itemId || !mediaType) return [];
    return buildSources({
      id: itemId,
      mediaType,
      imdbId: effectiveImdbId || undefined,
      season,
      episode,
      fullSeason,
      startAt,
    });
  }, [itemId, mediaType, effectiveImdbId, season, episode, fullSeason, startAt]);

  return { sources, resolving, resolvedImdbId: effectiveImdbId };
}

export const FloatingGlassTipCard: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}> = ({ isOpen, onClose, className = '' }) => {
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
          <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-2">
            <span className="lg-cinema-tip-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={11} className="text-red-500" />
              <span>TIP</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="lg-cinema-tip-close w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
              aria-label="Close Tip"
            >
              <X size={13} strokeWidth={2.6} />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Direct Watch Now Trigger
 * Starts playback immediately on the fastest server in the background without server UI clutter.
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
  isOpen,
  onToggle,
  buttonLabel,
  align = 'start',
}) => {
  return (
    <div
      className={`relative flex flex-col gap-2.5 ${
        align === 'center' ? 'items-center' : 'items-start'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
};

