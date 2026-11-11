/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * MangaDex@Home Integrated Chapter & Page Reader Viewport
 * - Supports Vertical Webtoon Scroll & RTL Single-Page Flip
 * - Uses referrerPolicy="no-referrer" for MangaDex@Home image nodes
 */

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { BookItem } from '../../../services/types';
import { useMangaChapterReader } from '../hooks/useMangaChapterReader';

export interface MangaReaderViewportProps {
  book: BookItem;
}

export const MangaReaderViewport: React.FC<MangaReaderViewportProps> = ({
  book,
}) => {
  const mangaId = book.id.replace(/^mangadex:/, '');
  const reader = useMangaChapterReader(mangaId, true);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-950/95 text-slate-100 p-3 sm:p-4 gap-3">
      {/* Chapter & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-xs font-bold">
            <Layers size={13} />
            <span>MangaDex@Home</span>
          </span>

          {reader.chapters.length > 0 && (
            <select
              value={reader.activeChapterId}
              onChange={(e) => reader.setActiveChapterId(e.target.value)}
              className="rounded-xl bg-slate-900 border border-white/15 px-3 py-1.5 text-xs text-white outline-none"
            >
              {reader.chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Ch. {ch.chapter} ({ch.translatedLanguage.toUpperCase()}) —{' '}
                  {ch.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              reader.setReadMode((m) =>
                m === 'webtoon' ? 'rtl-page' : 'webtoon',
              )
            }
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold cursor-pointer"
          >
            {reader.readMode === 'webtoon'
              ? 'وضع التمرير العمودي (Webtoon)'
              : 'وضع تقليب الصفحات (RTL)'}
          </button>

          <button
            type="button"
            onClick={() => reader.setUseDataSaver((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 text-xs cursor-pointer"
          >
            <Sparkles size={12} />
            <span>{reader.useDataSaver ? 'Data Saver' : 'HD Original'}</span>
          </button>
        </div>
      </div>

      {/* Pages Viewport */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-black/80 border border-white/10 p-2 sm:p-4">
        {reader.loadingChapters || reader.loadingPages ? (
          <div className="flex items-center justify-center h-64 gap-2 text-slate-300 text-sm">
            <RefreshCw size={16} className="animate-spin" />
            <span>Loading MangaDex@Home chapter pages...</span>
          </div>
        ) : reader.activePages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 gap-2">
            <p>لا توجد صفحات مصورة متاحة لهذا الفصل مباشرة.</p>
          </div>
        ) : reader.readMode === 'webtoon' ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
            {reader.activePages.map((pageUrl, idx) => (
              <img
                key={pageUrl}
                src={pageUrl}
                alt={`Page ${idx + 1}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={reader.nextPage}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <ChevronLeft size={15} />
                <span>الصفحة التالية</span>
              </button>
              <span className="text-xs text-slate-300">
                {reader.currentPageIdx + 1} / {reader.activePages.length}
              </span>
              <button
                type="button"
                onClick={reader.prevPage}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <span>الصفحة السابقة</span>
                <ChevronRight size={15} />
              </button>
            </div>
            <img
              src={reader.activePages[reader.currentPageIdx]}
              alt={`Page ${reader.currentPageIdx + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
};
