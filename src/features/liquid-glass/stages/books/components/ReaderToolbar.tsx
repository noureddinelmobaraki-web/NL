/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  Headphones,
  Maximize2,
  MoreHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useIsPhone } from '../../../../../hooks/useMediaQuery';
import { FilterSheet, SheetItem } from '../../../shared/FilterSheet';
import type { BookMirrorBranch } from '../../../services/types';

export interface ReaderToolbarProps {
  title: string;
  author: string;
  year?: string | number;
  eyeComfort: boolean;
  setEyeComfort: React.Dispatch<React.SetStateAction<boolean>>;
  readerZoom: number;
  setReaderZoom: React.Dispatch<React.SetStateAction<number>>;
  hasAudio: boolean;
  onAudio?: () => void;
  downloadUrl?: string;
  mirrors: BookMirrorBranch[];
  epubModeAvailable?: boolean;
  useEpubMode?: boolean;
  onToggleEpubMode?: () => void;
  onFullscreen: () => void;
  onClose: () => void;
}

export function ReaderToolbar(p: ReaderToolbarProps) {
  const isPhone = useIsPhone();
  const [more, setMore] = useState(false);
  const [mirrorsOpen, setMirrorsOpen] = useState(false);

  if (isPhone) {
    return (
      <div
        className="lg-reader-toolbar lg-reader-toolbar--phone"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={p.onClose}
          className="lg-glass-pill lg-icon-round-btn"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="lg-reader-toolbar__title" title={p.title}>
          {p.title}
        </span>

        <button
          type="button"
          onClick={() => p.setEyeComfort((v) => !v)}
          className={`lg-glass-pill lg-icon-round-btn ${
            p.eyeComfort ? 'lg-filter-pill--eye-active' : ''
          }`}
          aria-pressed={p.eyeComfort}
          aria-label="Eye comfort mode"
        >
          <Eye size={18} />
        </button>

        <button
          type="button"
          onClick={() => setMore(true)}
          className="lg-glass-pill lg-icon-round-btn"
          aria-label="More reader options"
        >
          <MoreHorizontal size={18} />
        </button>

        <FilterSheet open={more} onClose={() => setMore(false)}>
          {p.epubModeAvailable && p.onToggleEpubMode && (
            <SheetItem
              icon={BookOpen}
              label={p.useEpubMode ? 'Switch to Page Scan View' : 'Switch to Clean EPUB View'}
              onClick={() => {
                p.onToggleEpubMode?.();
                setMore(false);
              }}
            />
          )}
          {p.hasAudio && p.onAudio && (
            <SheetItem
              icon={Headphones}
              label="Listen to Audio Edition"
              onClick={() => {
                setMore(false);
                p.onAudio?.();
              }}
            />
          )}
          {p.downloadUrl && (
            <SheetItem
              icon={Download}
              label="Download Book"
              href={p.downloadUrl}
              onClick={() => setMore(false)}
            />
          )}
          {p.mirrors.map((m) => (
            <SheetItem
              key={m.id}
              icon={ExternalLink}
              label={m.label}
              href={m.url}
              onClick={() => setMore(false)}
            />
          ))}
        </FilterSheet>
      </div>
    );
  }

  return (
    <div className="lg-track-tube lg-reader-toolbar" onClick={(e) => e.stopPropagation()}>
      <span className="lg-orb-capsule-caustic" aria-hidden="true" />
      <span className="lg-orb-capsule-sheen" aria-hidden="true" />

      <div className="lg-reader-toolbar__meta">
        <h2 className="lg-reader-toolbar__title">{p.title}</h2>
        <p className="lg-reader-toolbar__author">
          {p.author}
          {p.year ? ` · ${p.year}` : ''}
        </p>
      </div>

      <div className="lg-reader-toolbar__controls">
        {p.epubModeAvailable && p.onToggleEpubMode && (
          <button
            type="button"
            onClick={p.onToggleEpubMode}
            className={`lg-glass-pill lg-filter-pill ${
              p.useEpubMode ? 'lg-filter-pill--active' : ''
            }`}
          >
            <BookOpen size={14} />
            <span>{p.useEpubMode ? 'EPUB Reader' : 'Clean EPUB'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => p.setEyeComfort((v) => !v)}
          className={`lg-glass-pill lg-filter-pill ${
            p.eyeComfort ? 'lg-filter-pill--eye-active' : ''
          }`}
          aria-pressed={p.eyeComfort}
        >
          <Eye size={14} />
          <span>{p.eyeComfort ? 'Eye Comfort On' : 'Eye Comfort'}</span>
        </button>

        {p.hasAudio && p.onAudio && (
          <button
            type="button"
            onClick={p.onAudio}
            className="lg-glass-pill lg-filter-pill lg-filter-pill--audio-cta"
          >
            <Headphones size={13} />
            <span>Audio Edition</span>
          </button>
        )}

        {p.useEpubMode && (
          <>
            <button
              type="button"
              onClick={() => p.setReaderZoom((z) => Math.max(80, z - 10))}
              className="lg-glass-pill lg-icon-round-btn"
              aria-label="Decrease font size"
            >
              <ZoomOut size={14} />
            </button>
            <span className="lg-reader-zoom-label">{p.readerZoom}%</span>
            <button
              type="button"
              onClick={() => p.setReaderZoom((z) => Math.min(165, z + 10))}
              className="lg-glass-pill lg-icon-round-btn"
              aria-label="Increase font size"
            >
              <ZoomIn size={14} />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={p.onFullscreen}
          className="lg-glass-pill lg-icon-round-btn"
          aria-label="Fullscreen reader"
        >
          <Maximize2 size={14} />
        </button>

        {/* Unified Frosted Glass Download + Mirrors Dropdown */}
        {(p.downloadUrl || p.mirrors.length > 0) && (
          <div className="relative flex items-center gap-1">
            {p.downloadUrl && (
              <a
                href={p.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="nl-glass-download-capsule nl-glass-download-capsule--compact"
              >
                <Download size={13} className="nl-glass-download-icon" />
                <span>Download</span>
              </a>
            )}
            {p.mirrors.length > 0 && (
              <button
                type="button"
                onClick={() => setMirrorsOpen((v) => !v)}
                className="nl-glass-download-capsule nl-glass-download-capsule--compact !px-2"
                aria-label="Mirror sources"
                title="Mirror sources"
              >
                <ChevronDown size={13} />
              </button>
            )}
            {mirrorsOpen && p.mirrors.length > 0 && (
              <div className="max-sm:fixed max-sm:inset-x-3 max-sm:bottom-16 max-sm:top-auto max-sm:w-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-56 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/20 p-2 shadow-2xl z-50 flex flex-col gap-1">
                {p.mirrors.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMirrorsOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white/85 hover:text-white hover:bg-white/10 flex items-center justify-between gap-2 no-underline"
                  >
                    <span className="truncate">{m.label}</span>
                    <ExternalLink size={12} className="shrink-0 opacity-75" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={p.onClose}
          className="lg-glass-pill lg-icon-round-btn"
          aria-label="Close reader"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
