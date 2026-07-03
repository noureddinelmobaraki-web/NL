import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { ACCOUNTS_BG_HLS } from '../../config/media';

function shouldSkipVideo(): boolean {
  if (typeof window === 'undefined') return true;
  const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const conn = (navigator as any).connection;
  const saveData = !!conn?.saveData;
  const slowNet = /(^|-)2g$/.test(conn?.effectiveType ?? '');
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4
    && window.matchMedia?.('(hover:none)').matches;
  return !!(rm || saveData || slowNet || weak);
}

export function AccountsBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled] = useState(() => !shouldSkipVideo());

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    const url = ACCOUNTS_BG_HLS;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;                     // Safari / iOS أصلي
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
    video.play().catch(() => {/* يُمنع التشغيل التلقائي أحياناً — لا بأس */});

    return () => {
      if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
      }
    };
  }, [enabled]);

  return (
    <div className="nl-accounts__bg" aria-hidden>
      {enabled && (
        <video
          ref={videoRef}
          className="nl-accounts__bg-video"
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        />
      )}
      <div className="nl-accounts__bg-glass" />
    </div>
  );
}
