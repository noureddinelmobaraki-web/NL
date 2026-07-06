import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Youtube, ChevronDown } from 'lucide-react';
import { useYoutubeVideos } from './useYoutubeVideos';
import { getChannelUrl } from './loadYoutube';
import { YouTubePlayer } from './YouTubePlayer';
import { VideoCard } from './VideoCard';
import { formatDate, formatViews } from './format';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useEscapeToClose } from './hooks/useEscapeToClose';
import { useTubeCollections } from './hooks/useTubeCollections';
import { useTubeTabs } from './hooks/useTubeTabs';
import { useTubeSelection } from './hooks/useTubeSelection';
import { useTubePagination } from './hooks/useTubePagination';

interface YouTubePortalProps {
  open: boolean;
  initialVideoId?: string;
  onClose: () => void;
}

const PAGE_SIZE = 12;
const EASE = [0.22, 1, 0.36, 1] as const;
const backdropAnim = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const panelAnim = {
  initial: { opacity: 0, y: 28, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 28, scale: 0.98 },
};
const panelTrans = { duration: 0.42, ease: EASE };
const backdropTrans = { duration: 0.28 };

export function YouTubePortal({ open, initialVideoId, onClose }: YouTubePortalProps) {
  const { videos, loading, error } = useYoutubeVideos(open);
  const tabs = useTubeCollections();
  const { activeTab, setActiveTab, filtered, allTabId } = useTubeTabs(videos, tabs);
  const { activeId, active, select } = useTubeSelection(videos, open, initialVideoId);
  const [descOpen, setDescOpen] = useState(false);

  useBodyScrollLock(open);
  useEscapeToClose(open, onClose);

  const rest = filtered.filter((v) => (active ? v.id !== active.id : true));
  const { visible, canShowMore, showMore } = useTubePagination(rest, PAGE_SIZE);

  const onSelect = useCallback(
    (id: string) => { select(id); setDescOpen(false); },
    [select],
  );
  const toggleDesc = useCallback(() => setDescOpen((v) => !v), []);
  const playingId = activeId || (active ? active.id : '');

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="nl-tube-backdrop"
          initial={backdropAnim.initial}
          animate={backdropAnim.animate}
          exit={backdropAnim.exit}
          transition={backdropTrans}
          onClick={onClose}
        >
          <motion.div
            className="nl-tube-root"
            initial={panelAnim.initial}
            animate={panelAnim.animate}
            exit={panelAnim.exit}
            transition={panelTrans}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="NL YOUTUBE"
          >
            <header className="nl-tube-header">
              <div className="nl-tube-brand">
                <span className="nl-tube-brand-mark">NL</span>
                <span className="nl-tube-brand-text">
                  <span className="nl-tube-brand-title">NL YOUTUBE</span>
                  <span className="nl-tube-brand-sub">Latest uploads</span>
                </span>
              </div>
              <button className="nl-tube-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </header>

            {tabs.length > 0 ? (
              <nav className="nl-tube-tabs" aria-label="Collections">
                <button
                  type="button"
                  className={activeTab === allTabId ? 'nl-tube-tab is-active' : 'nl-tube-tab'}
                  onClick={() => setActiveTab(allTabId)}
                >
                  All
                </button>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={activeTab === t.id ? 'nl-tube-tab is-active' : 'nl-tube-tab'}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            ) : null}

            <div className="nl-tube-body">
              {loading ? <div className="nl-tube-skeleton" /> : null}

              {!loading && active ? (
                <>
                  <YouTubePlayer videoId={playingId} autoplay />
                  <h2 className="nl-tube-title">{active.title}</h2>
                  <div className="nl-tube-meta">
                    <span>{formatDate(active.publishedAt)}</span>
                    {active.viewCount ? <span>{formatViews(active.viewCount)}</span> : null}
                  </div>
                  {active.description ? (
                    <div className={descOpen ? 'nl-tube-desc is-open' : 'nl-tube-desc'}>
                      <p>{active.description}</p>
                      <button className="nl-tube-desc-toggle" onClick={toggleDesc}>
                        <ChevronDown size={16} /> {descOpen ? 'Less' : 'More'}
                      </button>
                    </div>
                  ) : null}

                  {visible.length > 0 ? (
                    <>
                      <h3 className="nl-tube-grid-title">More videos</h3>
                      <div className="nl-tube-grid">
                        {visible.map((v) => (
                          <VideoCard key={v.id} video={v} active={false} onSelect={onSelect} />
                        ))}
                      </div>
                      {canShowMore ? (
                        <button type="button" className="nl-tube-more" onClick={showMore}>
                          MORE
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              {!loading && !active && !error ? (
                <div className="nl-tube-empty">
                  <Youtube size={40} />
                  <p>No videos yet.</p>
                  <a href={getChannelUrl()} target="_blank" rel="noreferrer" className="nl-tube-empty-link">
                    Visit channel
                  </a>
                </div>
              ) : null}

              {error ? <p className="nl-tube-error">Could not load videos.</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export default YouTubePortal;
