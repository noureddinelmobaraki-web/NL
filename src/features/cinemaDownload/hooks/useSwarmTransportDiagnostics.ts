/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Smart Custom Hook: Active Swarm & Transport Engine Diagnostics
 */

import { useCallback } from 'react';
import { useCinemaDownloadState } from '../downloadManager';
import type { ActiveTransportMode } from '../types';

export function useSwarmTransportDiagnostics(isAr = true) {
  const { bridgeServerAvailable, liveTrackersCount } = useCinemaDownloadState();

  const getTransportBadge = useCallback(
    (mode: ActiveTransportMode) => {
      switch (mode) {
        case 'webtorrent-bridge':
          return {
            label: isAr
              ? 'جسر التورنت الكامل (TCP/UDP/DHT)'
              : 'Full WebTorrent Bridge (TCP/UDP/DHT)',
            tone: 'emerald' as const,
          };
        case 'browser-webrtc-swarm':
          return {
            label: isAr
              ? 'سرب المتصفح المباشر (WebRTC + WebSeed)'
              : 'Browser WebRTC + WebSeed Swarm',
            tone: 'sky' as const,
          };
        case 'webseed-range':
          return {
            label: isAr
              ? 'بذرة ويب مباشرة (HTTP 206 Range)'
              : 'Direct WebSeed (HTTP 206)',
            tone: 'sky' as const,
          };
        case 'hls-assembler':
          return {
            label: isAr
              ? 'مجمّع البث السحابي السريع (HLS -> OPFS)'
              : 'Cloudflare High-Speed Assembler',
            tone: 'amber' as const,
          };
        default:
          return {
            label: isAr ? 'جاري فحص المسارات...' : 'Probing Transports...',
            tone: 'neutral' as const,
          };
      }
    },
    [isAr],
  );

  return {
    bridgeServerAvailable,
    liveTrackersCount,
    getTransportBadge,
  };
}
