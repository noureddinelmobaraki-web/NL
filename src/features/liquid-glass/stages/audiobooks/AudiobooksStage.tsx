/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * src/features/liquid-glass/stages/audiobooks/AudiobooksStage.tsx
 *
 * Modularized Liquid Glass Audiobooks Stage:
 *  - Uses shared GlassTopBar (responsive bottom sheets on phone, popovers on desktop).
 *  - Disables empty-space back click on touch devices (uses hardware Back via useBackToClose).
 *  - Disables background YouTube video & RAF droplet wobble on phone/low-power devices.
 *  - Renders desktop draggable PlayerCard or mobile bottom MiniPlayer.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Eye,
  Feather,
  Flame,
  Headphones,
  Landmark,
  Orbit,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useBackToClose } from '../../../../hooks/useBackToClose';
import { useIsPhone, useIsTouch } from '../../../../hooks/useMediaQuery';
import { isLowEndDevice, prefersReducedMotion } from '../../../../utils/perf';
import {
  type AudiobookChapter,
  type AudiobookItem,
  type BookItem,
  fetchAudiobookChapters,
  getInstantBookMatchForAudiobook,
  probeWrittenBookForAudiobook,
} from '../../booksAudioService';
import { GlassTopBar } from '../../shared/GlassTopBar';
import { FilterControls } from '../../shared/FilterControls';
import { GenreNav } from '../../shared/GenreNav';
import { CatalogShell } from '../../shared/CatalogShell';
import '../../shared/glass.css';
import { getRandomAmbientVideoId } from '../../youtubeBackgrounds';
import './audiobooks.css';
import { AudiobookCard } from './components/AudiobookCard';
import { AudiobookDetailView } from './components/AudiobookDetailView';
import { ResumeStrip } from './components/ResumeStrip';
import { useAudiobookPlayer } from './hooks/useAudiobookPlayer';
import { useAudiobooksCatalog } from './hooks/useAudiobooksCatalog';
import { useListeningProgress } from './hooks/useListeningProgress';

export interface AudiobooksStageProps {
  externalMuted: boolean;
  onToggleMute: () => void;
  onAudioActiveChange?: (active: boolean) => void;
  onAudioElementMount?: (el: HTMLMediaElement | null) => void;
  onBackToOrbs: () => void;
  initialSearchQuery?: string;
  initialSelectedAudiobook?: AudiobookItem | null;
  onSwitchToBook?: (query: string, matchedBook?: BookItem) => void;
}

const GENRES = [
  { id: 'popular', label: 'Popular', icon: Sparkles },
  { id: 'literature', label: 'Literature', icon: Feather },
  { id: 'science fiction', label: 'Sci-Fi', icon: Orbit },
  { id: 'mystery', label: 'Mystery', icon: Eye },
  { id: 'philosophy', label: 'Philosophy', icon: Compass },
  { id: 'history', label: 'History', icon: Landmark },
  { id: 'poetry', label: 'Poetry', icon: BookOpen },
  { id: 'fantasy', label: 'Fantasy', icon: Flame },
];

const LANGUAGES = [
  { id: 'all', label: 'All Languages' },
  { id: 'English', label: 'English' },
  { id: 'Arabic', label: 'Arabic' },
  { id: 'French', label: 'French' },
  { id: 'Spanish', label: 'Spanish' },
  { id: 'German', label: 'German' },
];

export const AudiobooksStage: React.FC<AudiobooksStageProps> = ({
  externalMuted,
  onToggleMute,
  onAudioActiveChange,
  onAudioElementMount,
  onBackToOrbs,
  initialSearchQuery = '',
  initialSelectedAudiobook = null,
  onSwitchToBook,
}) => {
  const isPhone = useIsPhone();
  const isTouch = useIsTouch();
  const lowPower = isLowEndDevice() || prefersReducedMotion() || isPhone;

  const {
    query,
    setQuery,
    debouncedQuery,
    genre,
    setGenre,
    language,
    setLanguage,
    page,
    setPage,
    audiobooks,
    loading,
    loadingMore,
    probedBookMap,
    setProbedBookMap,
    loadCatalog,
  } = useAudiobooksCatalog(initialSearchQuery);

  const [ambientVideoId, setAmbientVideoId] = useState<string>(() => getRandomAmbientVideoId());
  const [showVideoBg, setShowVideoBg] = useState<boolean>(true);
  const [isMorphingOut, setIsMorphingOut] = useState(false);

  const [selectedBook, setSelectedBook] = useState<AudiobookItem | null>(null);
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const { progressMap, recentProgressList, saveProgress } = useListeningProgress();

  const player = useAudiobookPlayer({
    selectedBook,
    chapters,
    externalMuted,
    onAudioActiveChange,
    onAudioElementMount,
    saveProgress,
  });

  const openAudiobook = useCallback(
    async (book: AudiobookItem, autoResume = true) => {
      setSelectedBook(book);
      setLoadingChapters(true);
      setChapters([]);
      player.setIsPlayerExpanded(true);
      setAmbientVideoId(getRandomAmbientVideoId());

      probeWrittenBookForAudiobook(book)
        .then((found) => {
          if (found) setProbedBookMap((prev) => ({ ...prev, [book.id]: found }));
        })
        .catch(() => {});

      try {
        const { coverUrl, tracks } = await fetchAudiobookChapters(book);
        if (coverUrl && coverUrl !== book.coverUrl) {
          setSelectedBook((prev) => (prev ? { ...prev, coverUrl } : prev));
        }
        setChapters(tracks);
        if (tracks.length > 0) {
          const saved = progressMap[book.id];
          const resumeIdx =
            autoResume && saved && saved.chapterIndex < tracks.length ? saved.chapterIndex : 0;
          const resumeSec = autoResume && saved ? saved.currentTime : 0;
          player.startChapterPlayback(tracks, resumeIdx, resumeSec);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingChapters(false);
      }
    },
    [progressMap, player, setProbedBookMap],
  );

  const openedInitialRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialSelectedAudiobook && openedInitialRef.current !== initialSelectedAudiobook.id) {
      openedInitialRef.current = initialSelectedAudiobook.id;
      void openAudiobook(initialSelectedAudiobook, true);
    }
  }, [initialSelectedAudiobook, openAudiobook]);

  const handleBackNavigation = useCallback(() => {
    if (selectedBook) {
      player.stopAudio();
      setSelectedBook(null);
    } else {
      onBackToOrbs();
    }
  }, [selectedBook, player, onBackToOrbs]);

  useBackToClose(Boolean(selectedBook), handleBackNavigation);

  const triggerSwitchToWrittenBook = useCallback(
    async (item: AudiobookItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!onSwitchToBook) return;
      player.stopAudio();
      setIsMorphingOut(true);

      const instant = getInstantBookMatchForAudiobook(item);
      let matched: BookItem | undefined = probedBookMap[item.id] ?? instant.matchedBook ?? undefined;
      if (!matched) {
        try {
          matched = (await probeWrittenBookForAudiobook(item)) ?? undefined;
        } catch {
          /* ignore */
        }
      }
      setTimeout(() => {
        onSwitchToBook(matched?.title || instant.searchQuery || item.title, matched);
      }, 240);
    },
    [onSwitchToBook, player, probedBookMap],
  );

  const handleStageEmptySpaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouch) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('.lg-audiobook-unit') ||
        target.closest('.lg-topbar-shell') ||
        target.closest('.lg-catalog-shell__header') ||
        target.closest('.lg-catalog-shell__left') ||
        target.closest('.lg-catalog-shell__right') ||
        target.closest('.lg-catalog-shell__top') ||
        target.closest('.lg-branch-popover') ||
        target.closest('.lg-album-player-column') ||
        target.closest('.lg-resume-tubes-strip')
      ) {
        return;
      }
      handleBackNavigation();
    },
    [isTouch, handleBackNavigation],
  );

  return (
    <div
      className={`lg-audiobooks-stage-root${
        isMorphingOut ? ' lg-audiobooks-stage-root--morph-out' : ''
      }`}
      dir="ltr"
      onClick={handleStageEmptySpaceClick}
    >
      <audio ref={player.audioRef} preload="none" crossOrigin="anonymous" />

      <button
        type="button"
        className="lg-glass-pill lg-back-orbs-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleBackNavigation();
        }}
        aria-label={selectedBook ? 'Back to Audiobooks' : 'Back to Portal Orbs'}
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>

      {!selectedBook && (
        <div className="lg-audiobooks-catalog-scroll" onClick={handleStageEmptySpaceClick}>
          <CatalogShell
            leftRail={
              <GenreNav
                genres={GENRES}
                activeGenre={genre}
                onGenreChange={(g: string) => {
                  setGenre(g);
                  setPage(1);
                }}
                orientation="vertical"
              />
            }
            rightRail={
              <FilterControls
                variant="panel"
                language={language}
                languages={LANGUAGES}
                onLanguageChange={(l: string) => {
                  setLanguage(l);
                  setPage(1);
                }}
                externalMuted={externalMuted}
                onToggleMute={onToggleMute}
              />
            }
            topBar={
              <GlassTopBar
                query={query}
                onQueryChange={setQuery}
                placeholder="Search audiobooks, authors, narrators..."
                language={language}
                onLanguageChange={(l: string) => {
                  setLanguage(l);
                  setPage(1);
                }}
                languages={LANGUAGES}
                activeGenre={genre}
                onGenreChange={(g: string) => {
                  setGenre(g);
                  setPage(1);
                }}
                genres={GENRES}
                externalMuted={externalMuted}
                onToggleMute={onToggleMute}
                resultCount={audiobooks.length}
              />
            }
          >
            {!debouncedQuery && (
              <ResumeStrip records={recentProgressList} onResume={openAudiobook} />
            )}

            {loading ? (
              <div className="lg-audiobooks-grid">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="lg-audiobook-unit">
                    <div className="lg-audiobook-poster-frame lg-audiobook-poster-frame--skeleton">
                      <span className="lg-main-glass__caustic" aria-hidden="true" />
                      <span className="lg-main-glass__rim" aria-hidden="true" />
                    </div>
                    <div className="lg-track-tube lg-audiobook-info-capsule lg-audiobook-info-capsule--skeleton">
                      <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                    </div>
                  </div>
                ))}
              </div>
            ) : audiobooks.length === 0 ? (
              <div className="lg-empty-glass-state">
                <div className="lg-track-tube lg-empty-glass-capsule">
                  <span className="lg-orb-capsule-caustic" aria-hidden="true" />
                  <span className="lg-orb-capsule-sheen" aria-hidden="true" />
                  <Headphones size={30} className="lg-empty-glass-icon" />
                  <p className="lg-empty-glass-title">No matching audiobooks found</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setGenre('popular');
                      setLanguage('all');
                    }}
                    className="lg-glass-pill lg-filter-pill lg-filter-pill--active"
                  >
                    <RefreshCw size={14} />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="lg-audiobooks-grid" role="list">
                  {audiobooks.map((item, idx) => {
                    const instantBook = getInstantBookMatchForAudiobook(item);
                    const matchedBook = probedBookMap[item.id] || instantBook.matchedBook;
                    return (
                      <AudiobookCard
                        key={item.id}
                        item={item}
                        index={idx}
                        savedRec={progressMap[item.id]}
                        hasBookVersion={Boolean(matchedBook || instantBook.hasBook)}
                        onOpen={openAudiobook}
                        onReadBook={onSwitchToBook ? triggerSwitchToWrittenBook : undefined}
                      />
                    );
                  })}
                </div>

                {audiobooks.length >= 12 && (
                  <div className="lg-load-more-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (loading || loadingMore) return;
                        const next = page + 1;
                        setPage(next);
                        void loadCatalog(next, true);
                      }}
                      disabled={loadingMore}
                      className="lg-glass-pill lg-load-more-pill"
                    >
                      <RefreshCw size={15} className={loadingMore ? 'lg-spin' : ''} />
                      <span>{loadingMore ? 'Loading...' : 'Load More Audiobooks'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </CatalogShell>
        </div>
      )}

      {selectedBook && (
        <AudiobookDetailView
          selectedBook={selectedBook}
          chapters={chapters}
          loadingChapters={loadingChapters}
          player={player}
          externalMuted={externalMuted}
          showVideoBg={showVideoBg}
          ambientVideoId={ambientVideoId}
          lowPower={lowPower}
          isPhone={isPhone}
          hasSwitchToBook={Boolean(onSwitchToBook)}
          onToggleVideoBg={() => setShowVideoBg((v) => !v)}
          onToggleMute={onToggleMute}
          onEmptySpaceClick={handleStageEmptySpaceClick}
          onSwitchToWrittenBook={(item, e) => void triggerSwitchToWrittenBook(item, e)}
        />
      )}
    </div>
  );
};
