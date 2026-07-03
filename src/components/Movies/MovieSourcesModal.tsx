import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, AlertCircle } from 'lucide-react';

export interface PlaySource {
  name: string;
  host: string;
  url: string;
}

export interface CinemaItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  imdbId?: string;
}

export function extractImdbId(imdbId?: string): string {
  if (!imdbId) return "";
  const match = imdbId.match(/(tt\d+)/);
  return match ? match[1] : imdbId.trim();
}

export function buildSources(item: { mediaType: 'movie' | 'tv'; imdbId?: string }): PlaySource[] {
  const imdbId = extractImdbId(item.imdbId);
  if (!imdbId) return [];
  const type = item.mediaType === 'movie' ? 'movie' : 'tv';
  return [
    {
      name: "PlayIMDb",
      host: "playimdb.com",
      url: `https://www.playimdb.com/title/${imdbId}/`
    },
    {
      name: "StreamIMDb",
      host: "streamimdb.ru",
      url: `https://streamimdb.ru/embed/${type}/${imdbId}`
    },
    {
      name: "IMDb.su",
      host: "player.imdb.su",
      url: `https://player.imdb.su/embed/${type}/${imdbId}`
    }
  ];
}

interface MovieSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CinemaItem | null;
}

export const MovieSourcesModal: React.FC<MovieSourcesModalProps> = ({ isOpen, onClose, item }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    } else {
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    }
  }, [isOpen]);

  // Focus trap & escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    // Set initial focus to close button or first action button
    setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button');
      if (focusable && focusable.length > 0) {
        if (focusable[1]) {
          focusable[1].focus();
        } else if (focusable[0]) {
          focusable[0].focus();
        }
      }
    }, 50);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!item) return null;

  const sources = buildSources(item);
  const hasImdb = sources.length > 0;

  const handleOpenSource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-text">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[390px] bg-[#1c1c1c] text-zinc-100 rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col z-10"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/40">
              <h3 className="text-md font-bold text-zinc-100 truncate pl-3">{item.title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-zinc-400 leading-relaxed font-sans text-center">
                Select one of the three sources to open the movie in your browser
              </p>

              {hasImdb ? (
                <div className="flex flex-col gap-3">
                  {sources.map((source) => (
                    <button
                      key={source.name}
                      type="button"
                      onClick={() => handleOpenSource(source.url)}
                      className="group flex flex-col w-full text-right p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-orange-500/50 hover:bg-gradient-to-r hover:from-orange-600/90 hover:to-orange-500/90 transition duration-200 cursor-pointer text-zinc-100 shadow-md outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-sm text-zinc-200 group-hover:text-white transition duration-150">
                          {source.name}
                          <span className="font-normal text-xs text-zinc-400 group-hover:text-orange-100 mr-1.5 transition duration-150">
                            ({source.host})
                          </span>
                        </span>
                        <ExternalLink size={14} className="text-zinc-500 group-hover:text-white transition duration-150" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-tight break-all block text-left group-hover:text-orange-200/90 transition duration-150" dir="ltr">
                        {source.url}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-red-950/20 border border-red-900/40 rounded-xl text-center gap-3">
                  <AlertCircle className="text-red-500" size={32} />
                  <p className="text-sm font-bold text-red-400">No ID exists IMDb for this title</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-zinc-900/50 border-t border-zinc-800/40 text-center">
              <span className="text-[11px] text-zinc-500 font-sans tracking-wide">
                Opens safely in a new tab
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
