/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle } from "lucide-react";

interface TvPlayerProps {
  url: string;
  isPlaying: boolean;
  muted: boolean;
  volume: number;
  onVideoRefReady: (video: HTMLVideoElement | null) => void;
  onErrorState: (hasError: boolean) => void;
}

export function TvPlayer({
  url,
  isPlaying,
  muted,
  volume,
  onVideoRefReady,
  onErrorState
}: TvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Handle Video element setup & loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    setError(false);
    onErrorState(false);
    setLoading(true);

    let hls: Hls | null = null;

    const handleLoadedMetadata = () => {
      setLoading(false);
    };

    const handleWaiting = () => {
      setLoading(true);
    };

    const handlePlaying = () => {
      setLoading(false);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple device support (Safari / iOS / macOS)
      video.src = url;
    } else if (Hls.isSupported()) {
      // Modern browser support via hls.js
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferSize: 0,
        maxBufferLength: 10
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          console.warn("HLS live streaming fatal error:", data.type);
          setError(true);
          onErrorState(true);
          setLoading(false);
        }
      });
    } else {
      setError(true);
      onErrorState(true);
      setLoading(false);
    }

    onVideoRefReady(video);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
      }
      onVideoRefReady(null);
    };
  }, [url, onVideoRefReady, onErrorState]);

  // Handle IsPlaying transitions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && !error) {
      video.play().catch((err) => {
        console.warn("Autoplay or play promise blocked:", err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, error, url]);

  // Handle muted & volume changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    // Set actual volume on the video tag
    video.volume = volume;
  }, [muted, volume]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-[1] select-none flex items-center justify-center pointer-events-none">
      
      {/* HTML5 Video element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="w-full h-full object-contain pointer-events-auto bg-black"
        style={{ zIndex: 1 }}
      />

      {/* Loading stream spinner overlay */}
      {loading && !error && (
        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-[2] pointer-events-none animate-fade-in">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
          <p className="text-zinc-300 text-xs font-mono tracking-widest uppercase">
            Buffering Live Stream
          </p>
        </div>
      )}

      {/* Stream Error fallback */}
      {error && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center px-6 text-center gap-4 z-[3] pointer-events-auto">
          <AlertCircle className="w-16 h-16 text-red-500/80 animate-bounce" />
          <h3 className="text-xl font-bold text-zinc-100">
            {t("nltv.channelError") ? t("nltv.channelError").split(".")[0] : "Live Channel Offline"}
          </h3>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            {t("nltv.channelError") || "This channel is currently unavailable. Try another channel."}
          </p>
        </div>
      )}

    </div>
  );
}
