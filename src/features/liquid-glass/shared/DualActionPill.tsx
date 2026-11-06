/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import React from 'react';
import { Eye, Headphones } from 'lucide-react';

export interface DualActionPillProps {
  primaryMode: 'read' | 'listen';
  hasCounterpart: boolean;
  onRead: (e: React.MouseEvent) => void;
  onListen: (e: React.MouseEvent) => void;
}

export const DualActionPill: React.FC<DualActionPillProps> = ({
  primaryMode,
  hasCounterpart,
  onRead,
  onListen,
}) => {
  if (hasCounterpart) {
    return (
      <div
        className="lg-dual-split-pill"
        role="group"
        aria-label={primaryMode === 'read' ? 'Read or Listen' : 'Listen or Read'}
      >
        {primaryMode === 'read' ? (
          <>
            <button
              type="button"
              className="lg-dual-split-pill__half lg-dual-split-pill__half--read"
              onClick={onRead}
              title="Read Book"
              aria-label="Read Book"
            >
              <Eye size={15} strokeWidth={2.2} />
              <span>Read</span>
            </button>
            <span className="lg-dual-split-pill__divider" aria-hidden="true" />
            <button
              type="button"
              className="lg-dual-split-pill__half lg-dual-split-pill__half--audio"
              onClick={onListen}
              title="Listen to Audiobook"
              aria-label="Listen to Audiobook"
            >
              <Headphones size={15} strokeWidth={2.2} />
              <span>Audio</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="lg-dual-split-pill__half lg-dual-split-pill__half--audio"
              onClick={onListen}
              title="Listen to Audiobook"
              aria-label="Listen to Audiobook"
            >
              <Headphones size={15} strokeWidth={2.2} />
              <span>Listen</span>
            </button>
            <span className="lg-dual-split-pill__divider" aria-hidden="true" />
            <button
              type="button"
              className="lg-dual-split-pill__half lg-dual-split-pill__half--read"
              onClick={onRead}
              title="Read Written Edition"
              aria-label="Read Written Edition"
            >
              <Eye size={15} strokeWidth={2.2} />
              <span>Read</span>
            </button>
          </>
        )}
      </div>
    );
  }

  if (primaryMode === 'read') {
    return (
      <button
        type="button"
        className="lg-single-read-pill"
        onClick={onRead}
        title="Read Book"
      >
        <Eye size={15} strokeWidth={2.2} />
        <span>Read</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="lg-single-audio-pill"
      onClick={onListen}
      title="Listen to Audiobook"
    >
      <Headphones size={15} strokeWidth={2.2} />
      <span>Listen</span>
    </button>
  );
};
