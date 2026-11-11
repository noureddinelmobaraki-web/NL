/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Eye,
  Minimize2,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useIsPhone } from '../../../../../hooks/useMediaQuery';
import type { BookItem, BookResolveResult } from '../../../services/types';
import { ReaderToolbar } from './ReaderToolbar';
import { MangaReaderViewport } from './MangaReaderViewport';
import { ManuscriptSpreadModal } from './ManuscriptSpreadModal';

export interface BookReaderProps {
  book: BookItem;
  resolveResult: BookResolveResult | null;
  resolving: boolean;
  hasAudio: boolean;
  onSwitchToAudiobook?: () => void;
  onClose: () => void;
  onEmptySpaceClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const BookReader: React.FC<BookReaderProps> = ({
  book,
  resolveResult,
  resolving,
  hasAudio,
  onSwitchToAudiobook,
  onClose,
  onEmptySpaceClick,
}) => {
  const isPhone = useIsPhone();
  const [readerZoom, setReaderZoom] = useState<number>(100);
  const [readerFullscreen, setReaderFullscreen] = useState<boolean>(false);
  const [showFsControls, setShowFsControls] = useState<boolean>(false);
  const [eyeComfortMode, setEyeComfortMode] = useState<boolean>(false);
  const [useEpubMode, setUseEpubMode] = useState<boolean>(false);
  const [epubChaptersText, setEpubChaptersText] = useState<string[]>([]);
  const [epubLoading, setEpubLoading] = useState<boolean>(false);

  const fmts = useMemo(
    () => ({
      ...(book.directReadFormats || {}),
      ...(resolveResult?.directReadFormats || {}),
    }),
    [book.directReadFormats, resolveResult?.directReadFormats],
  );

  const epubUrl = fmts.epub || '';
  const isArabic =
    book.language?.toLowerCase().startsWith('ar') ||
    /[\u0600-\u06FF]/.test(book.title);

  // Optional internal EPUB unpacker using JSZip when user toggles Clean EPUB View
  useEffect(() => {
    if (!useEpubMode || !epubUrl) return undefined;
    let cancelled = false;
    setEpubLoading(true);

    (async () => {
      try {
        const [{ default: JSZip }, res] = await Promise.all([
          import('jszip'),
          fetch(epubUrl),
        ]);
        if (!res.ok) throw new Error('CORS or network block');
        const buf = await res.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const htmlFiles = Object.keys(zip.files)
          .filter((name) => /\.(xhtml|html|htm)$/i.test(name))
          .sort();

        const extracted: string[] = [];
        for (const fileName of htmlFiles.slice(0, 18)) {
          const rawHtml = await zip.files[fileName].async('string');
          const parser = new DOMParser();
          const doc = parser.parseFromString(rawHtml, 'text/html');
          const text = (doc.body?.innerText || doc.body?.textContent || '').trim();
          if (text.length > 80) {
            extracted.push(text);
          }
        }
        if (!cancelled && extracted.length > 0) {
          setEpubChaptersText(extracted);
        }
      } catch {
        if (!cancelled) {
          setEpubChaptersText([]);
        }
      } finally {
        if (!cancelled) setEpubLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useEpubMode, epubUrl]);

  const activeEmbedUrl = useMemo(() => {
    if (fmts.embed) return fmts.embed;
    if (book.iaId || resolveResult?.iaId) {
      const id = resolveResult?.iaId || book.iaId;
      return `https://archive.org/embed/${encodeURIComponent(id!)}?ui=embed`;
    }
    if (fmts.html) return fmts.html;
    if (fmts.pdf && !isPhone) {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fmts.pdf)}`;
    }
    if (fmts.preview) return fmts.preview;
    if (book.isbn || resolveResult?.isbn) {
      const isbn = resolveResult?.isbn || book.isbn;
      return `https://openlibrary.org/isbn/${encodeURIComponent(isbn!)}`;
    }
    return `https://archive.org/details/texts?and%5B%5D=${encodeURIComponent(book.title)}`;
  }, [book, resolveResult, fmts, isPhone]);

  const bestDownloadUrl = useMemo(() => {
    if (fmts.pdf) return fmts.pdf;
    if (fmts.epub) return fmts.epub;
    if (resolveResult?.mirrors && resolveResult.mirrors.length > 0) {
      return resolveResult.mirrors[0].url;
    }
    if (book.iaId) {
      return `https://archive.org/details/${encodeURIComponent(book.iaId)}`;
    }
    return `https://openlibrary.org/search?q=${encodeURIComponent(book.title)}`;
  }, [book, resolveResult, fmts]);

  const desktopScaleStyle: React.CSSProperties | undefined = !isPhone
    ? {
        width: `${10000 / readerZoom}%`,
        height: `${10000 / readerZoom}%`,
        transform: `scale(${readerZoom / 100})`,
        transformOrigin: '0 0',
      }
    : undefined;

  return (
    <div
      className={`lg-reader-workspace${
        readerFullscreen ? ' lg-reader-workspace--fullscreen' : ''
      }${eyeComfortMode ? ' lg-reader-workspace--eye-comfort' : ''}`}
      onClick={onEmptySpaceClick}
    >
      {readerFullscreen && !isPhone ? (
        <div
          className="lg-fs-top-sensor"
          onMouseEnter={() => setShowFsControls(true)}
          onMouseLeave={() => setShowFsControls(false)}
          onClick={(e) => {
            e.stopPropagation();
            setShowFsControls((v) => !v);
          }}
        >
          <div
            className={`lg-fs-floating-bar lg-track-tube ${
              showFsControls ? 'lg-fs-floating-bar--visible' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="lg-fs-title" title={book.title}>
              {book.title}
            </span>
            <div className="lg-reader-toolbar__controls">
              <button
                type="button"
                onClick={() => setEyeComfortMode((v) => !v)}
                className={`lg-glass-pill lg-filter-pill ${
                  eyeComfortMode ? 'lg-filter-pill--eye-active' : ''
                }`}
              >
                <Eye size={14} />
                <span>{eyeComfortMode ? 'Eye Comfort On' : 'Eye Comfort'}</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderZoom((z) => Math.max(80, z - 10))}
                className="lg-glass-pill lg-icon-round-btn"
                aria-label="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="lg-reader-zoom-label">{readerZoom}%</span>
              <button
                type="button"
                onClick={() => setReaderZoom((z) => Math.min(150, z + 10))}
                className="lg-glass-pill lg-icon-round-btn"
                aria-label="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setReaderFullscreen(false)}
                className="lg-glass-pill lg-icon-round-btn"
                aria-label="Exit fullscreen"
              >
                <Minimize2 size={14} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="lg-glass-pill lg-icon-round-btn"
                aria-label="Close reader"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ReaderToolbar
          title={book.title}
          author={book.author}
          year={book.year}
          eyeComfort={eyeComfortMode}
          setEyeComfort={setEyeComfortMode}
          readerZoom={readerZoom}
          setReaderZoom={setReaderZoom}
          hasAudio={hasAudio}
          onAudio={onSwitchToAudiobook}
          downloadUrl={bestDownloadUrl}
          mirrors={resolveResult?.mirrors || []}
          epubModeAvailable={Boolean(epubUrl || fmts.html)}
          useEpubMode={useEpubMode}
          onToggleEpubMode={() => setUseEpubMode((v) => !v)}
          onFullscreen={() => setReaderFullscreen(true)}
          onClose={onClose}
        />
      )}

      <div
        className={`lg-reader-stage-card${
          eyeComfortMode ? ' lg-reader-stage-card--eye-comfort' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="lg-main-glass__caustic" aria-hidden="true" />
        <span className="lg-main-glass__rim" aria-hidden="true" />

        <div className="lg-embed-reader-wrap">
          {(resolving || epubLoading) && (
            <div className="lg-embed-loading-pill lg-glass-pill">
              <RefreshCw size={14} className="lg-spin" />
              <span>Loading Book Pages...</span>
            </div>
          )}

          {book.ext === 'manga' || book.id.startsWith('mangadex:') ? (
            <MangaReaderViewport book={book} />
          ) : book.ext === 'manuscript' ||
            book.ext === 'quran' ||
            book.ext === 'poetry' ||
            book.id.startsWith('ia-ms-') ||
            book.id.startsWith('sacred:') ||
            book.id.startsWith('poetry') ? (
            <ManuscriptSpreadModal book={book} />
          ) : useEpubMode && epubChaptersText.length > 0 ? (
            <div
              className={`lg-epub-surface ${eyeComfortMode ? 'lg-epub-surface--dark' : ''}`}
              dir={isArabic ? 'rtl' : 'ltr'}
              style={{ fontSize: `${Math.round((16 * readerZoom) / 100)}px` }}
            >
              <div className="lg-epub-content">
                <h2>{book.title}</h2>
                <p style={{ opacity: 0.75 }}>{book.author}</p>
                {epubChaptersText.map((chText, i) => (
                  <section key={i} style={{ marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
                    {chText}
                  </section>
                ))}
              </div>
            </div>
          ) : isPhone && fmts.pdf && !fmts.embed && !book.iaId ? (
            <div
              className={`lg-epub-surface ${eyeComfortMode ? 'lg-epub-surface--dark' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              <h3>{book.title}</h3>
              <p>Open the native mobile PDF viewer for smooth pinch-zoom and fast rendering.</p>
              <a
                href={fmts.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-single-read-pill"
                style={{ maxWidth: '240px', textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
                <span>Open PDF in Phone Viewer</span>
              </a>
            </div>
          ) : (
            <div
              className={`lg-embed-page-filter-layer${
                eyeComfortMode ? ' lg-embed-page-filter-layer--warm' : ''
              }`}
            >
              <iframe
                key={useEpubMode && fmts.html ? fmts.html : activeEmbedUrl}
                src={useEpubMode && fmts.html ? fmts.html : activeEmbedUrl}
                title={book.title}
                className="lg-embed-reader-iframe"
                style={desktopScaleStyle}
                allow="fullscreen"
              />
            </div>
          )}

          <div className="lg-embed-bottom-bar">
            {resolveResult?.mirrors.slice(0, 3).map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="lg-glass-pill lg-filter-pill"
              >
                <ExternalLink size={12} />
                <span>{m.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
