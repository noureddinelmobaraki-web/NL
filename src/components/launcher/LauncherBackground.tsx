// src/components/launcher/LauncherBackground.tsx
// Fully covers the launcher: an OPAQUE base color (so nothing behind can bleed
// through), the HLS glass background video on top (object-cover), and a uniform
// dark gradient veil so the glass UI stays legible across the whole screen.
// style objects are single-brace variables (no inline double braces).

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { ACCOUNTS_BG_HLS } from '../../config/media';

function shouldSkipVideo(): boolean {
  if (typeof window === 'undefined') return true;
  const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const saveData = !!conn?.saveData;
  const slowNet = /(^|-)2g$/.test(conn?.effectiveType ?? '');
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4 && window.matchMedia?.('(hover:none)').matches;
  return !!(rm || saveData || slowNet || weak);
}

const veilStyle = {
  background:
    'radial-gradient(120% 90% at 50% 10%, rgba(8,16,26,0.30) 0%, rgba(8,16,26,0.62) 55%, rgba(6,12,20,0.86) 100%)',
};

export function LauncherBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled] = useState(() => !shouldSkipVideo());

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    const url = ACCOUNTS_BG_HLS;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, maxBufferLength: 8, backBufferLength: 8, maxBufferSize: 0 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (d.fatal) {
          hls?.destroy();
          hls = null;
        }
      });
    }
    video.play().catch(() => {});

    return () => {
      if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
      }
    };
  }, [enabled]);

  return (
    <div className="nl-launcher-bg" aria-hidden="true">
      {/* Opaque base so no page behind can ever show through */}
      <div className="nl-launcher-bg-base" />

      {enabled ? (
        <video
          ref={videoRef}
          className="nl-launcher-bg-media"
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        />
      ) : (
        <div className="nl-launcher-bg-media nl-launcher-bg-still" />
      )}

      {/* Uniform darkening veil across the entire screen */}
      <div className="nl-launcher-bg-veil" style={veilStyle} />
    </div>
  );
}
