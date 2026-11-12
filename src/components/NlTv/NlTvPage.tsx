/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useTranslation } from "react-i18next";
import { X, Tv, HelpCircle } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";

import { useIdle } from "../../hooks/useIdle";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";

import { TvStatic } from "./TvStatic";
import { TvPlayer } from "./TvPlayer";
import { TvControls } from "./TvControls";
import { CountryGrid } from "./CountryGrid";
import { ChannelGrid } from "./ChannelGrid";
import { NlTvModeSwitcher } from "./components/NlTvModeSwitcher";
import { RadioLiveStage } from "./components/RadioLiveStage";
import { EpgProgramRibbon } from "./components/EpgProgramRibbon";
import {
  useLiveTvCatalog,
  useRadioCatalog,
  useStremioLiveResolver,
  useTvSearchIndex,
  useTvMusic,
  useTvNavigation,
  useTvPlaybackState,
  useTvFullscreen,
  useTvChannelZapping,
  useTvKeyboardShortcuts,
} from "./hooks";

interface NlTvPageProps {
  onClose: () => void;
}

export default function NlTvPage({ onClose }: NlTvPageProps) {
  const { t, i18n } = useTranslation();

  // Custom document headers for title & description
  useDocumentMeta("nav.nltv", "nltv.description");

  const {
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
    isVideoError,
    setIsVideoError,
    isRecording,
    recordErr,
    handleToggleRecording,
    handleVideoRefReady,
    handleVideoErrorState,
  } = useTvPlaybackState();

  const {
    broadcastMode,
    setBroadcastMode,
    countries,
    loadingCountries,
    channels,
    setChannels,
    loadingChannels,
    selectedCountry,
    setSelectedCountry,
    selectedChannel,
    setSelectedChannel,
    handlePickChannel,
    handleSelectCountry,
    handleSelectChannel,
  } = useTvNavigation({
    setIsPlaying,
    setIsVideoError,
  });

  const {
    isIndexing,
    isLoaded: isSearchIndexLoaded,
    initIndex,
    searchGlobal,
  } = useTvSearchIndex(countries);

  const { currentEpg } = useLiveTvCatalog(selectedChannel);
  const {
    stations: radioStations,
    activeStation,
    isLoadingRadio,
    isRadioPlaying,
    audioRef: radioAudioRef,
    playStation,
    toggleRadioPlay,
    setIsRadioPlaying,
  } = useRadioCatalog(selectedCountry?.code || "MA");
  const { stremioChannels, isLoadingStremio } = useStremioLiveResolver(
    broadcastMode === "stremio"
  );

  const { isFullscreen, containerRef, handleToggleFullscreen } = useTvFullscreen();

  const { handlePrevChannel, handleNextChannel } = useTvChannelZapping({
    selectedChannel,
    channels,
    setSelectedChannel,
    setIsPlaying,
    setIsVideoError,
  });

  useTvKeyboardShortcuts({
    selectedChannel,
    selectedCountry,
    setSelectedChannel,
    setIsPlaying,
    setSelectedCountry,
    setChannels,
    onClose,
  });

  // Idle timeout detector (Auto-hide overlay in 3 seconds of inactivty)
  const isIdle = useIdle(3000);
  const hideOverlays = isIdle && selectedChannel && isPlaying && !isVideoError;

  useTvMusic(Boolean(selectedChannel && isPlaying && !isVideoError));

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
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-[40] pointer-events-none"
          >
            {/* Branding title & indicator */}
            <div className="nl-tv-badge flex items-center gap-3 bg-neutral-950/45 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl pointer-events-auto">
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

            {/* Broadcast Mode Switcher: Live TV | Live Radio | Stremio HD */}
            <NlTvModeSwitcher
              mode={broadcastMode}
              onChangeMode={(nextMode) => {
                setBroadcastMode(nextMode);
                if (nextMode === "radio") {
                  setIsPlaying(false);
                }
              }}
            />

            {/* Close button with focus guidelines */}
            <button
              onClick={onClose}
              role="button"
              aria-label={t("movies.close") || "Close"}
              tabIndex={0}
              className="nl-tv-close p-3 bg-neutral-950/45 hover:bg-red-600/20 hover:border-red-600/40 border border-white/10 rounded-full text-zinc-400 hover:text-white transition duration-300 pointer-events-auto active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <X size={18} />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Radio Broadcast Stage */}
      {broadcastMode === "radio" && (
        <div className="absolute inset-0 top-20 bottom-10 z-30 flex items-center justify-center overflow-y-auto">
          <RadioLiveStage
            stations={radioStations}
            activeStation={activeStation}
            isPlaying={isRadioPlaying}
            isLoading={isLoadingRadio}
            onSelectStation={playStation}
            onTogglePlay={toggleRadioPlay}
            audioRef={radioAudioRef}
            onPlayingStateChange={setIsRadioPlaying}
          />
        </div>
      )}

      {/* 4. Left/Right Navigation Sidebar Column (Countries or Channels) */}
      <AnimatePresence>
        {!hideOverlays && broadcastMode !== "radio" && (
          <m.div
            initial={{ opacity: 0, x: isRtl ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 40 : -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`absolute top-24 bottom-24 ${
              isRtl ? "right-5" : "left-5"
            } w-full max-w-[340px] z-30 flex flex-col p-2 pointer-events-none hidden sm:flex`}
          >
            {broadcastMode === "stremio" ? (
              <ChannelGrid
                countryName="Stremio Live Addons"
                countryFlag="US"
                channels={stremioChannels}
                selectedChannelId={selectedChannel ? selectedChannel.id : null}
                onSelectChannel={handleSelectChannel}
                onBack={() => setBroadcastMode("tv")}
                isLoading={isLoadingStremio}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
                countries={countries}
                onPickCountry={handleSelectCountry}
              />
            ) : !selectedCountry ? (
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
          </m.div>
        )}
      </AnimatePresence>

      {/* Mobile-only responsive drawer when not in idle view */}
      <AnimatePresence>
        {!hideOverlays && broadcastMode !== "radio" && (
          <div className="absolute top-24 bottom-28 inset-x-4 z-30 flex flex-col sm:hidden overflow-hidden pointer-events-none">
            {broadcastMode === "stremio" ? (
              <ChannelGrid
                countryName="Stremio Live Addons"
                countryFlag="US"
                channels={stremioChannels}
                selectedChannelId={selectedChannel ? selectedChannel.id : null}
                onSelectChannel={handleSelectChannel}
                onBack={() => setBroadcastMode("tv")}
                isLoading={isLoadingStremio}
                isSearchIndexLoaded={isSearchIndexLoaded}
                isIndexing={isIndexing}
                onInitSearchIndex={initIndex}
                onSearchGlobal={searchGlobal}
                onPickChannel={handlePickChannel}
                countries={countries}
                onPickCountry={handleSelectCountry}
              />
            ) : !selectedCountry ? (
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
      {!selectedChannel && broadcastMode !== "radio" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
          <div className="nl-tv-empty-card bg-neutral-950/65 backdrop-blur-md border border-white/5 p-8 rounded-3xl max-w-sm text-center shadow-2xl">
            <Tv className="w-16 h-16 text-zinc-650 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-zinc-100 mb-2">
              {t("nltv.title") || "NL TV"}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {t("nltv.description") ||
                "Choose a country and channel to begin live international television playback."}
            </p>
            <div className="flex items-center gap-2 justify-center text-[10px] text-zinc-500 font-mono">
              <HelpCircle size={12} />
              <span>
                {t("nltv.publicNotice") ||
                  "Streams are from public sources via iptv-org."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Live floating Recorder error log toasts */}
      <AnimatePresence>
        {!hideOverlays && recordErr && (
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-red-600/90 text-white rounded-xl px-5 py-3 shadow-xl z-50 text-xs text-center border border-red-500/35 backdrop-blur-md max-w-sm pointer-events-auto"
          >
            <p className="font-semibold">{recordErr}</p>
          </m.div>
        )}
      </AnimatePresence>

      {/* 7. Bottom glass controls bar + EPG Ribbon (auto hides on idle) */}
      <AnimatePresence>
        {!hideOverlays && selectedChannel && broadcastMode !== "radio" && (
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-5 inset-x-0 z-40 pointer-events-none"
          >
            <EpgProgramRibbon epg={currentEpg} />
            <TvControls
              channelName={selectedChannel.name}
              countryFlag={selectedCountry ? selectedCountry.flag : "US"}
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
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
