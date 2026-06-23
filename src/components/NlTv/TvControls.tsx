/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize2, Minimize2, Circle, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TvControlsProps {
  channelName: string;
  countryFlag: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  recordingSupported: boolean;
}

export function TvControls({
  channelName,
  countryFlag,
  isPlaying,
  onTogglePlay,
  isMuted,
  onToggleMute,
  volume,
  onVolumeChange,
  onNextChannel,
  onPrevChannel,
  isFullscreen,
  onToggleFullscreen,
  isRecording,
  onToggleRecording,
  recordingSupported
}: TvControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-xl mx-auto px-4 pointer-events-auto">
      <div className="bg-neutral-950/75 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300">
        
        {/* Flag and Channel Name */}
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
          <span className="text-2xl select-none" role="img" aria-label="Flag">
            {countryFlag}
          </span>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-semibold text-zinc-100 truncate tracking-wide max-w-[180px] sm:max-w-[130px] md:max-w-[170px]">
              {channelName}
            </h4>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase font-mono">
              Live Stream
            </p>
          </div>
        </div>

        {/* Media Buttons: SkipBack, Play/Pause, SkipForward */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevChannel}
            title={t("nltv.prevChannel") || "Previous Channel"}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg active:scale-90 transition cursor-pointer"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-3 bg-red-600 text-white hover:bg-red-500 rounded-full shadow-lg active:scale-95 hover:shadow-red-900/40 hover:shadow-xl transition cursor-pointer flex items-center justify-center w-11 h-11"
            title={isPlaying ? t("nav.pause") : t("movies.play")}
          >
            {isPlaying ? <Pause size={18} className="fill-white" /> : <Play size={18} className="fill-white translate-x-[1px]" />}
          </button>

          <button
            onClick={onNextChannel}
            title={t("nltv.nextChannel") || "Next Channel"}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg active:scale-90 transition cursor-pointer"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Control Features: Volume, Record, Fullscreen */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          
          {/* Volume Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg active:scale-95 transition cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          {/* Record Control */}
          {recordingSupported && (
            <button
              onClick={onToggleRecording}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition ${
                isRecording
                  ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse"
                  : "text-zinc-300 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
              title={isRecording ? t("nltv.recording") || "Recording..." : t("nltv.record") || "Record"}
            >
              {isRecording ? <Square size={14} className="fill-current" /> : <Circle size={14} className="fill-red-500 text-red-500" />}
              <span className="hidden sm:inline">
                {isRecording ? t("nltv.recording") : t("nltv.record")}
              </span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg active:scale-95 transition cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

      </div>
    </div>
  );
}
