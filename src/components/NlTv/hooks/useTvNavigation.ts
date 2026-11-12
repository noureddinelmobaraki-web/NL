/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type Country,
  type TvChannel,
  fetchCountries,
  fetchCountryChannels,
} from "../iptvHelper";
import type { NlTvBroadcastMode } from "../components/NlTvModeSwitcher";

export interface UseTvNavigationOptions {
  setIsPlaying: (playing: boolean) => void;
  setIsVideoError: (err: boolean) => void;
}

export function useTvNavigation({
  setIsPlaying,
  setIsVideoError,
}: UseTvNavigationOptions) {
  const [broadcastMode, setBroadcastMode] = useState<NlTvBroadcastMode>("tv");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);

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

  const handlePickChannel = useCallback(
    async (
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
            logo: logo || "",
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
    },
    [countries, setIsPlaying, setIsVideoError]
  );

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

  const handleSelectChannel = useCallback(
    (channel: TvChannel) => {
      setSelectedChannel(channel);
      setIsPlaying(true);
      setIsVideoError(false);
    },
    [setIsPlaying, setIsVideoError]
  );

  return {
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
  };
}

export type UseTvNavigationResult = ReturnType<typeof useTvNavigation>;
