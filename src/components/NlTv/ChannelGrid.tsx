/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Tv, ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { TvAutocomplete } from "./TvAutocomplete";
import { TvSuggestion } from "./useTvSearchIndex";
import { Country, TvChannel } from "./iptvHelper";

interface ChannelGridProps {
  countryName: string;
  countryFlag: string;
  channels: TvChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: TvChannel) => void;
  onBack: () => void;
  isLoading: boolean;
  isSearchIndexLoaded?: boolean;
  isIndexing?: boolean;
  onInitSearchIndex?: () => void;
  onSearchGlobal?: (query: string) => TvSuggestion[];
  onPickChannel?: (
    channelId: string,
    countryCode: string,
    url: string,
    name: string,
    logo?: string
  ) => void;
  countries?: Country[];
  onPickCountry?: (country: Country) => void;
}

export function ChannelGrid({
  countryName,
  countryFlag,
  channels,
  selectedChannelId,
  onSelectChannel,
  onBack,
  isLoading,
  isSearchIndexLoaded = false,
  isIndexing = false,
  onInitSearchIndex = () => {},
  onSearchGlobal = () => [],
  onPickChannel = () => {},
  countries = [],
  onPickCountry = () => {}
}: ChannelGridProps) {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const isRtl = i18n.dir() === "rtl";

  const filteredChannels = useMemo(() => {
    if (!searchTerm.trim()) return channels;
    const term = searchTerm.toLowerCase();
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.group && c.group.toLowerCase().includes(term))
    );
  }, [channels, searchTerm]);

  return (
    <div className="flex flex-col h-full w-full pointer-events-auto bg-neutral-950/45 backdrop-blur-lg border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* Search Header */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        
        {/* Navigation & Title Group */}
        <div className="flex items-center gap-2 justify-between">
          <button
            onClick={onBack}
            className="p-1 px-2.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{t("nltv.back") || "Back"}</span>
          </button>
          
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-xl select-none" role="img" aria-label={countryName}>
              {countryFlag}
            </span>
            <span className="text-xs font-bold text-zinc-100 truncate">
              {countryName}
            </span>
          </div>
        </div>

        {/* Live Channel Input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={t("nltv.searchChannel") || "Search channels..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-900/80 border border-white/5 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-sans"
          />
          <TvAutocomplete
            searchTerm={searchTerm}
            isSearchIndexLoaded={isSearchIndexLoaded}
            isIndexing={isIndexing}
            onInitSearchIndex={onInitSearchIndex}
            onSearchGlobal={onSearchGlobal}
            onPickCountry={onPickCountry}
            onPickChannel={onPickChannel}
            countries={countries}
          />
        </div>

      </div>

      {/* Grid listing channels */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
              Fetching Playlist...
            </p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            {t("nltv.noChannels") || "No channels found"}
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-2 gap-2">
            {filteredChannels.map((c) => {
              const isSelected = selectedChannelId === c.id;
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  aria-label={c.name}
                  onClick={() => onSelectChannel(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectChannel(c);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 p-3 rounded-2xl border text-center transition-all duration-300 select-none cursor-pointer h-[105px] overflow-hidden group ${
                    isSelected
                      ? "bg-red-500/15 border-red-500/60 shadow-lg text-white"
                      : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white"
                  }`}
                >
                  {/* Channel Logo / Fallback */}
                  <div className="w-10 h-10 rounded-xl bg-neutral-900/50 border border-white/5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105">
                    {c.logo ? (
                      <img
                        src={c.logo}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-contain p-0.5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback = target.nextSibling as HTMLDivElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="fallback-logo w-full h-full flex items-center justify-center"
                      style={{ display: c.logo ? "none" : "flex" }}
                    >
                      <Tv size={16} className={`${isSelected ? "text-red-500" : "text-zinc-500"}`} />
                    </div>
                  </div>

                  {/* Channel Title */}
                  <div className="w-full">
                    <p className="text-[11px] font-semibold truncate px-1 tracking-wide">
                      {c.name}
                    </p>
                    {c.group && (
                      <p className="text-[8px] text-zinc-500 truncate font-mono uppercase tracking-wider mt-0.5">
                        {c.group}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
