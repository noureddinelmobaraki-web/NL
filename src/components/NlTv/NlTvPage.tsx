/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Tv, HelpCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useIdle } from "../../hooks/useIdle";
import { useTvRecorder } from "../../hooks/useTvRecorder";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";

import { TvStatic } from "./TvStatic";
import { TvPlayer } from "./TvPlayer";
import { TvControls } from "./TvControls";
import { CountryGrid } from "./CountryGrid";
import { ChannelGrid } from "./ChannelGrid";
import { Country, TvChannel, fetchCountries, fetchCountryChannels } from "./iptvHelper";
import { useTvSearchIndex } from "./useTvSearchIndex";
import { useTvMusic } from "./useTvMusic";

interface NlTvPageProps {
  onClose: () => void;
}

export default function NlTvPage({ onClose }: NlTvPageProps) {
  const { t, i18n } = useTranslation();
  
  // Custom document headers for title & description
  useDocumentMeta("nav.nltv", "nltv.description");

  // Country & Channels indices states
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Global Tv Search index
  const {
    isIndexing,
    isLoaded: isSearchIndexLoaded,
    initIndex,
    searchGlobal
  } = useTvSearchIndex(countries);

  // Active Selections
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);

  const handlePickChannel = useCallback(async (
    channelId: string,
    countryCode: string,
    url: string,
    name: string,
    logo?: string
  ) => {
    const matched = countries.find((c) => c.code === countryCode);
    if (matched) {
      setSelectedCountry(matched);
      setLoadingChannels(true);
      setChannels([]);
      try {
        const loaded = await fetchCountryChannels(countryCode);
        setChannels(loaded);
        const resolved = loaded.find((c) => c.id === channelId) || {
          id: channelId,
          name,
          url,
          logo: logo || ""
        };
        setSelectedChannel(resolved);
        setIsPlaying(true);
        setIsVideoError(false);
      } catch {
        const fallback: TvChannel = { id: channelId, name, url, logo: logo || "" };
        setChannels([fallback]);
        setSelectedChannel(fallback);
        setIsPlaying(true);
        setIsVideoError(false);
      } finally {
        setLoadingChannels(false);
      }
    } else {
      const fallback: TvChannel = { id: channelId, name, url, logo: logo || "" };
      setSelectedChannel(fallback);
      setIsPlaying(true);
      setIsVideoError(false);
    }
  }, [countries]);

  // Video controller parameters
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isVideoError, setIsVideoError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for recorder & fullscreen containers
  const videoRefElement = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Idle timeout detector (Auto-hide overlay in 3 seconds of inactivty)
  const isIdle = useIdle(3000);
  const hideOverlays = isIdle && selectedChannel && isPlaying && !isVideoError;

  // Media live recording hook
  const { isRecording, errorMsg: recordErr, startRecording, stopRecording } = useTvRecorder();

  useTvMusic(Boolean(selectedChannel && isPlaying && !isVideoError));

  // Load countries on page load
  useEffect(() => {
    let active = true;
    fetchCountries().then((data) => {
      if (active) {
        setCountries(data);
        setLoadingCountries(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Escape key handler to unselect channel, country, or exit TV
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedChannel) {
          setSelectedChannel(null);
          setIsPlaying(false);
        } else if (selectedCountry) {
          setSelectedCountry(null);
          setChannels([]);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedChannel, selectedCountry, onClose]);

  // Fullscreen toggle callback
  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        console.warn("Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Read actual Fullscreen changes in the DOM
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  // Country selection event
  const handleSelectCountry = useCallback(async (country: Country) => {
    setSelectedCountry(country);
    setLoadingChannels(true);
    setChannels([]);
    try {
      const data = await fetchCountryChannels(country.code);
      setChannels(data);
    } catch {
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // Channel selection event
  const handleSelectChannel = useCallback((channel: TvChannel) => {
    setSelectedChannel(channel);
    setIsPlaying(true);
    setIsVideoError(false);
  }, []);

  // Prev / Next channel within the current country index
  const handlePrevChannel = useCallback(() => {
    if (!selectedChannel || channels.length <= 1) return;
    const currentIdx = channels.findIndex((c) => c.id === selectedChannel.id);
    if (currentIdx === -1) return;
    const prevIdx = (currentIdx - 1 + channels.length) % channels.length;
    setSelectedChannel(channels[prevIdx]);
    setIsPlaying(true);
    setIsVideoError(false);
  }, [selectedChannel, channels]);

  const handleNextChannel = useCallback(() => {
    if (!selectedChannel || channels.length <= 0) return;
    const currentIdx = channels.findIndex((c) => c.id === selectedChannel.id);
    if (currentIdx === -1) return;
    const nextIdx = (currentIdx + 1) % channels.length;
    setSelectedChannel(channels[nextIdx]);
    setIsPlaying(true);
    setIsVideoError(false);
  }, [selectedChannel, channels]);

  // Recorder toggle callback
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (videoRefElement.current) {
      startRecording(videoRefElement.current);
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVideoRefReady = useCallback((video: HTMLVideoElement | null) => {
    videoRefElement.current = video;
  }, []);

  const handleVideoErrorState = useCallback((hasError: boolean) => {
    setIsVideoError(hasError);
    if (hasError) {
      setIsPlaying(false);
    }
  }, []);

  const isRtl = i18n.dir() === "rtl";

  return (
    <div
      ref={containerRef}
      className={`nl-tv-root fixed inset-0 w-full h-full bg-black z-[9999] overflow-hidden flex flex-col font-sans transition-all duration-300 ${
        hideOverlays ? "cursor-none" : "cursor-default"
      }`}
    >
      {/* 1. Canvas Static noise background */}
      <TvStatic active={!!selectedChannel} />

      {/* 2. Live HLS Video Stream Player */}
      {selectedChannel && (
        <TvPlayer
          url={selectedChannel.url}
          isPlaying={isPlaying}
          muted={isMuted}
          volume={volume}
          onVideoRefReady={handleVideoRefReady}
          onErrorState={handleVideoErrorState}
        />
      )}

      {/* 3. Top navigation header dock (auto hides on idle) */}
      <AnimatePresence>
        {!hideOverlays && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-[40] pointer-events-none"
          >
            {/* Branding title & indicator */}
            <div className="flex items-center gap-3 bg-neutral-950/45 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
              <Tv className="w-5 h-5 text-red-500" />
              <div className="text-left">
                <h1 className="text-sm font-black text-zinc-100 tracking-wide font-sans">
                  NL TV
                </h1>
                {selectedChannel && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-bold text-red-500 tracking-wider uppercase font-mono">
                      Live Playback
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Close button with focus guidelines */}
            <button
              onClick={onClose}
              role="button"
              aria-label={t("movies.close") || "Close"}
              tabIndex={0}
              className="p-3 bg-neutral-950/45 hover:bg-red-600/20 hover:border-red-600/40 border border-white/10 rounded-full text-zinc-400 hover:text-white transition duration-300 pointer-events-auto active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Left/Right Navigation Sidebar Column (Countries or Channels) */}
      <AnimatePresence>
        {!hideOverlays && (
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 40 : -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`absolute top-24 bottom-24 ${
              isRtl ? "right-5" : "left-5"
            } w-full max-w-[340px] z-30 flex flex-col p-2 pointer-events-none hidden sm:flex`}
          >
            {!selectedCountry ? (
              <CountryGrid
                countries={countries}
                selectedCountryCode={null}
                onSelectCountry={handleSelectCountry}
                isLoading={loadingCountries}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
              />
            ) : (
              <ChannelGrid
                countryName={selectedCountry.name}
                countryFlag={selectedCountry.flag}
                channels={channels}
                selectedChannelId={selectedChannel ? selectedChannel.id : null}
                onSelectChannel={handleSelectChannel}
                onBack={() => {
                  setSelectedCountry(null);
                  setChannels([]);
                }}
                isLoading={loadingChannels}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
                countries={countries}
                onPickCountry={handleSelectCountry}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-only responsive drawer when not in idle view */}
      <AnimatePresence>
        {!hideOverlays && (
          <div className="absolute top-24 bottom-28 inset-x-4 z-30 flex flex-col sm:hidden overflow-hidden pointer-events-none">
            {!selectedCountry ? (
              <CountryGrid
                countries={countries}
                selectedCountryCode={null}
                onSelectCountry={handleSelectCountry}
                isLoading={loadingCountries}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
              />
            ) : (
              <ChannelGrid
                countryName={selectedCountry.name}
                countryFlag={selectedCountry.flag}
                channels={channels}
                selectedChannelId={selectedChannel ? selectedChannel.id : null}
                onSelectChannel={handleSelectChannel}
                onBack={() => {
                  setSelectedCountry(null);
                  setChannels([]);
                }}
                isLoading={loadingChannels}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
                countries={countries}
                onPickCountry={handleSelectCountry}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* 5. Center display notice if no channel is active */}
      {!selectedChannel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
          <div className="bg-neutral-950/65 backdrop-blur-md border border-white/5 p-8 rounded-3xl max-w-sm text-center shadow-2xl">
            <Tv className="w-16 h-16 text-zinc-650 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-zinc-100 mb-2">
              {t("nltv.title") || "NL TV"}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {t("nltv.description") || "Choose a country and channel to begin live international television playback."}
            </p>
            <div className="flex items-center gap-2 justify-center text-[10px] text-zinc-500 font-mono">
              <HelpCircle size={12} />
              <span>{t("nltv.publicNotice") || "Streams are from public sources via iptv-org."}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Live floating Recorder error log toasts */}
      <AnimatePresence>
        {!hideOverlays && recordErr && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-red-600/90 text-white rounded-xl px-5 py-3 shadow-xl z-50 text-xs text-center border border-red-500/35 backdrop-blur-md max-w-sm pointer-events-auto"
          >
            <p className="font-semibold">{recordErr}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Bottom glass controls bar (auto hides on idle) */}
      <AnimatePresence>
        {!hideOverlays && selectedChannel && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-5 inset-x-0 z-40 pointer-events-none"
          >
            <TvControls
              channelName={selectedChannel.name}
              countryFlag={selectedCountry ? selectedCountry.flag : ""}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              volume={volume}
              onVolumeChange={(v) => {
                setVolume(v);
                setIsMuted(v === 0);
              }}
              onNextChannel={handleNextChannel}
              onPrevChannel={handlePrevChannel}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
              recordingSupported={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
