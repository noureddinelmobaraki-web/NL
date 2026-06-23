/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Globe, ChevronRight } from "lucide-react";
import { Country } from "./iptvHelper";

import { TvAutocomplete } from "./TvAutocomplete";
import { TvSuggestion } from "./useTvSearchIndex";

interface CountryGridProps {
  countries: Country[];
  selectedCountryCode: string | null;
  onSelectCountry: (country: Country) => void;
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
}

export function CountryGrid({
  countries,
  selectedCountryCode,
  onSelectCountry,
  isLoading,
  isSearchIndexLoaded = false,
  isIndexing = false,
  onInitSearchIndex = () => {},
  onSearchGlobal = () => [],
  onPickChannel = () => {}
}: CountryGridProps) {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const isRtl = i18n.dir() === "rtl";

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return countries;
    const term = searchTerm.toLowerCase();
    return countries.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term)
    );
  }, [countries, searchTerm]);

  return (
    <div className="flex flex-col h-full w-full max-w-sm pointer-events-auto bg-neutral-950/45 backdrop-blur-lg border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-bold text-zinc-100 tracking-wide font-sans">
            {t("nltv.title") || "NL TV"}
          </h3>
        </div>
        
        {/* Search Countries */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={t("nltv.searchCountry") || "Search countries..."}
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
            onPickCountry={onSelectCountry}
            onPickChannel={onPickChannel}
            countries={countries}
          />
        </div>
      </div>

      {/* Countries scrollable body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
              Loading Index...
            </p>
          </div>
        ) : filteredCountries.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-mono">
            No countries found
          </div>
        ) : (
          filteredCountries.map((c) => {
            const isSelected = selectedCountryCode === c.code;
            return (
              <div
                key={c.code}
                role="button"
                tabIndex={0}
                aria-label={c.name}
                onClick={() => onSelectCountry(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectCountry(c);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left cursor-pointer transition-all duration-300 select-none ${
                  isSelected
                    ? "bg-red-500/10 border-red-500/40 text-white"
                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none" role="img" aria-label={c.name}>
                    {c.flag}
                  </span>
                  <span className="text-xs font-semibold tracking-wide font-sans">
                    {c.name}
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  className={`text-zinc-500 transition-transform ${isRtl ? "rotate-180" : ""} ${
                    isSelected ? (isRtl ? "translate-x-1" : "-translate-x-1") : ""
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
