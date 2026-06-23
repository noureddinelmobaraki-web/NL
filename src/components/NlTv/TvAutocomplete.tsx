/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { TvSuggestion } from "./useTvSearchIndex";
import { Country } from "./iptvHelper";

interface TvAutocompleteProps {
  searchTerm: string;
  isSearchIndexLoaded: boolean;
  isIndexing: boolean;
  onInitSearchIndex: () => void;
  onSearchGlobal: (query: string) => TvSuggestion[];
  onPickCountry: (country: Country) => void;
  onPickChannel: (
    channelId: string,
    countryCode: string,
    url: string,
    name: string,
    logo?: string
  ) => void;
  countries: Country[];
}

export function TvAutocomplete({
  searchTerm,
  isSearchIndexLoaded,
  isIndexing,
  onInitSearchIndex,
  onSearchGlobal,
  onPickCountry,
  onPickChannel,
  countries,
}: TvAutocompleteProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TvSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy initialize search index on focus of input / change of value
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      if (!isSearchIndexLoaded && !isIndexing) {
        onInitSearchIndex();
      }
      const results = onSearchGlobal(searchTerm);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [searchTerm, isSearchIndexLoaded, isIndexing, onInitSearchIndex, onSearchGlobal]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = useCallback((s: TvSuggestion) => {
    setIsOpen(false);
    if (s.kind === "country") {
      const match = countries.find((c) => c.code === s.code);
      if (match) onPickCountry(match);
    } else {
      onPickChannel(s.channelId, s.countryCode, s.url, s.name, s.logo);
    }
  }, [countries, onPickCountry, onPickChannel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, suggestions, activeIndex, handleSelect]);

  if (!isOpen) return null;

  // Highlight matched search term substring
  const renderHighlighted = (name: string) => {
    const index = name.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return <span className="font-semibold">{name}</span>;
    const before = name.substring(0, index);
    const match = name.substring(index, index + searchTerm.length);
    const after = name.substring(index + searchTerm.length);
    return (
      <span className="font-sans">
        {before}
        <strong className="text-red-500 font-extrabold">{match}</strong>
        {after}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-neutral-950/85 backdrop-blur-lg border border-white/10 rounded-2xl max-h-[280px] overflow-y-auto custom-scrollbar shadow-2xl p-1.5 pointer-events-auto"
      role="listbox"
      aria-label={t("nltv.suggestions") || "Search suggestions"}
    >
      {isIndexing && (
        <div className="px-3 py-2 text-[10px] text-zinc-500 font-mono flex items-center gap-2">
          <div className="w-2.5 h-2.5 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
          <span>{t("nltv.buildingIndex") || "Building index..."}</span>
        </div>
      )}

      {suggestions.map((s, idx) => {
        const isSelected = activeIndex === idx;
        const key = s.kind === "country" ? `sug_${s.code}` : `sug_${s.channelId}`;

        return (
          <div
            key={key}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelect(s)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer select-none transition ${
              isSelected ? "bg-white/10 text-white" : "text-zinc-300 hover:text-white"
            }`}
          >
            {s.kind === "country" ? (
              <span className="text-xl select-none">{s.flag}</span>
            ) : s.logo ? (
              <img
                src={s.logo}
                alt=""
                className="w-5 h-5 rounded object-contain bg-neutral-900 border border-white/5"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded bg-neutral-900 flex items-center justify-center text-[10px] font-bold text-zinc-650">
                📺
              </div>
            )}

            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs truncate">{renderHighlighted(s.name)}</div>
              <div className="text-[9px] text-zinc-500 font-mono tracking-wider truncate">
                {s.kind === "country"
                  ? t("nltv.country") || "Country"
                  : `${s.countryName}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
