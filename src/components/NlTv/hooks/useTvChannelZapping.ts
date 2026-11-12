/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { useCallback } from "react";
import type { TvChannel } from "../iptvHelper";

export interface UseTvChannelZappingOptions {
  selectedChannel: TvChannel | null;
  channels: TvChannel[];
  setSelectedChannel: (channel: TvChannel | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsVideoError: (err: boolean) => void;
}

export function useTvChannelZapping({
  selectedChannel,
  channels,
  setSelectedChannel,
  setIsPlaying,
  setIsVideoError,
}: UseTvChannelZappingOptions) {
  const handlePrevChannel = useCallback(() => {
    if (!selectedChannel || channels.length <= 1) return;
    const currentIdx = channels.findIndex((c) => c.id === selectedChannel.id);
    if (currentIdx === -1) return;
    const prevIdx = (currentIdx - 1 + channels.length) % channels.length;
    setSelectedChannel(channels[prevIdx]);
    setIsPlaying(true);
    setIsVideoError(false);
  }, [selectedChannel, channels, setSelectedChannel, setIsPlaying, setIsVideoError]);

  const handleNextChannel = useCallback(() => {
    if (!selectedChannel || channels.length <= 0) return;
    const currentIdx = channels.findIndex((c) => c.id === selectedChannel.id);
    if (currentIdx === -1) return;
    const nextIdx = (currentIdx + 1) % channels.length;
    setSelectedChannel(channels[nextIdx]);
    setIsPlaying(true);
    setIsVideoError(false);
  }, [selectedChannel, channels, setSelectedChannel, setIsPlaying, setIsVideoError]);

  return {
    handlePrevChannel,
    handleNextChannel,
  };
}

export type UseTvChannelZappingResult = ReturnType<typeof useTvChannelZapping>;
