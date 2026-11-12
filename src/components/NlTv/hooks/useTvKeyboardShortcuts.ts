/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useEffect } from "react";
import type { Country, TvChannel } from "../iptvHelper";

export interface UseTvKeyboardShortcutsOptions {
  selectedChannel: TvChannel | null;
  selectedCountry: Country | null;
  setSelectedChannel: (channel: TvChannel | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedCountry: (country: Country | null) => void;
  setChannels: (channels: TvChannel[]) => void;
  onClose: () => void;
}

export function useTvKeyboardShortcuts({
  selectedChannel,
  selectedCountry,
  setSelectedChannel,
  setIsPlaying,
  setSelectedCountry,
  setChannels,
  onClose,
}: UseTvKeyboardShortcutsOptions) {
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
  }, [
    selectedChannel,
    selectedCountry,
    setSelectedChannel,
    setIsPlaying,
    setSelectedCountry,
    setChannels,
    onClose,
  ]);
}

export type UseTvKeyboardShortcutsResult = ReturnType<typeof useTvKeyboardShortcuts>;
