import React from 'react';
import { Radio, Play, Pause, Activity } from 'lucide-react';
import type { RadioStation } from '../services/radioBrowserService';
import { CountryFlagGlassIcon, GlassVectorIcon } from '../../shared/icons';

export interface RadioLiveStageProps {
  stations: RadioStation[];
  activeStation: RadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  onSelectStation: (station: RadioStation) => void;
  onTogglePlay: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPlayingStateChange: (playing: boolean) => void;
}

export const RadioLiveStage: React.FC<RadioLiveStageProps> = ({
  stations,
  activeStation,
  isPlaying,
  isLoading,
  onSelectStation,
  onTogglePlay,
  audioRef,
  onPlayingStateChange,
}) => {
  return (
    <div className="pointer-events-auto flex flex-col lg:flex-row items-center justify-between gap-5 w-full max-w-5xl mx-auto px-4 py-6">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => onPlayingStateChange(true)}
        onPause={() => onPlayingStateChange(false)}
      />

      {/* Active Radio Deck Card */}
      <div className="w-full lg:w-5/12 rounded-3xl bg-neutral-950/75 backdrop-blur-xl border border-white/15 p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="relative w-24 h-24 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shadow-inner">
          <GlassVectorIcon icon={Radio} theme="comedy" size={34} active={isPlaying} />
          {isPlaying && (
            <span className="absolute -bottom-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 flex items-center gap-1">
              <Activity size={11} className="animate-pulse" />
              ON AIR
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-white">
            {activeStation ? activeStation.name : 'Select a Radio Station'}
          </h3>
          {activeStation && (
            <div className="inline-flex items-center gap-2 text-xs text-zinc-300">
              <CountryFlagGlassIcon code={activeStation.countrycode} name={activeStation.country} size={16} />
              <span>{activeStation.country}</span>
              <span>·</span>
              <span className="font-mono text-amber-300">
                {activeStation.codec} {activeStation.bitrate}kbps
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!activeStation}
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-40"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'إيقاف البث الإذاعي' : 'تشغيل البث المباشر'}</span>
        </button>
      </div>

      {/* Stations List */}
      <div className="w-full lg:w-7/12 rounded-3xl bg-neutral-950/70 backdrop-blur-xl border border-white/15 p-4 shadow-2xl max-h-[340px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-2 pb-3 border-b border-white/10 mb-3">
          <span className="text-xs font-extrabold text-white tracking-wide">
            Global & Arabic Radio Stations ({stations.length})
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-zinc-400 font-mono">
            Loading live radio frequencies...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stations.map((st) => {
              const selected = activeStation?.stationuuid === st.stationuuid;
              return (
                <button
                  key={st.stationuuid}
                  type="button"
                  onClick={() => onSelectStation(st)}
                  className={`flex items-center justify-between gap-2.5 p-3 rounded-2xl border text-left transition cursor-pointer ${
                    selected
                      ? 'bg-amber-500/15 border-amber-400/50 text-white'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlagGlassIcon code={st.countrycode} name={st.country} size={18} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{st.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{st.tags}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 shrink-0">
                    {st.bitrate}k
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
