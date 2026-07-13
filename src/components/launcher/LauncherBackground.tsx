import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { ACCOUNTS_BG_HLS } from '../../config/media';

const veilStyle = {
  background:
    'radial-gradient(120% 90% at 50% 10%, rgba(8,16,26,0.22) 0%, rgba(8,16,26,0.58) 56%, rgba(6,12,20,0.84) 100%)',
};

export function LauncherBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let startTimer = 0;
    let retryTimer = 0;
    let mediaRecoveries = 0;
    let networkRecoveries = 0;
    let pointerRetryAttached = false;

    const removePointerRetry = () => {
      if (!pointerRetryAttached) return;
      pointerRetryAttached = false;
      window.removeEventListener('pointerdown', retryFromGesture, true);
    };

    const markReady = () => {
      if (cancelled) return;
      setReady(true);
      setFailed(false);
    };

    const play = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        video.muted = true;
        await video.play();
        markReady();
        removePointerRetry();
      } catch {
        // Muted autoplay normally succeeds. If browser policy still rejects it,
        // one pointer gesture retries without changing any UI behavior.
        if (!pointerRetryAttached) {
          pointerRetryAttached = true;
          window.addEventListener('pointerdown', retryFromGesture, {
            capture: true,
            once: true,
          });
        }
      }
    };

    function retryFromGesture() {
      pointerRetryAttached = false;
      void play();
    }

    const startNativeHls = () => {
      video.src = ACCOUNTS_BG_HLS;
      video.load();
      void play();
    };

    const startHlsJs = async () => {
      try {
        const module = await import('hls.js');
        if (cancelled) return;
        const HlsClass = module.default;
        if (!HlsClass.isSupported()) {
          setFailed(true);
          return;
        }

        const hls = new HlsClass({
          enableWorker: true,
          lowLatencyMode: false,
          capLevelToPlayerSize: true,
          startLevel: 0,
          maxBufferLength: 5,
          maxMaxBufferLength: 10,
          backBufferLength: 0,
          maxBufferSize: 8 * 1024 * 1024,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 4,
        });
        hlsRef.current = hls;

        hls.on(HlsClass.Events.MEDIA_ATTACHED, () => {
          if (!cancelled) hls.loadSource(ACCOUNTS_BG_HLS);
        });
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          if (!cancelled) void play();
        });
        hls.on(HlsClass.Events.FRAG_BUFFERED, () => {
          if (!cancelled && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            void play();
          }
        });
        hls.on(HlsClass.Events.ERROR, (_event, data) => {
          if (cancelled || !data.fatal) return;

          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3) {
            networkRecoveries += 1;
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(() => hls.startLoad(-1), 450 * networkRecoveries);
            return;
          }

          if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
            mediaRecoveries += 1;
            hls.recoverMediaError();
            return;
          }

          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          setFailed(true);
        });

        hls.attachMedia(video);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    const start = () => {
      if (cancelled) return;
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        startNativeHls();
      } else {
        void startHlsJs();
      }
    };

    // Paint the reception controls first, but always attempt video shortly after.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startTimer = window.setTimeout(start, 320);
      });
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        video.pause();
        hlsRef.current?.stopLoad();
      } else {
        hlsRef.current?.startLoad(-1);
        void play();
      }
    };

    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', play);
    video.addEventListener('playing', markReady);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(retryTimer);
      removePointerRetry();
      video.removeEventListener('loadeddata', markReady);
      video.removeEventListener('canplay', play);
      video.removeEventListener('playing', markReady);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      video.pause();
      hlsRef.current?.stopLoad();
      hlsRef.current?.detachMedia();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  return (
    <div className="nl-launcher-bg" aria-hidden="true" data-video-failed={failed ? 'true' : 'false'}>
      <div className="nl-launcher-bg-base" />
      <video
        ref={videoRef}
        className={`nl-launcher-bg-media ${ready ? 'is-ready' : ''}`}
        muted
        autoPlay
        loop
        playsInline
        preload="none"
        disablePictureInPicture
      />
      <div className="nl-launcher-bg-veil" style={veilStyle} />
    </div>
  );
}
