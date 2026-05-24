// src/components/sections/iptv/types.ts

export interface StreamItem {
  id: string;
  name: string;
  category: 'radio' | 'music_channels' | 'music_audio';
  group: string;
  logo: string;
  url: string;
  qualities: { quality: string; url: string }[];
  currentQualityIndex: number;
  failCount?: number;
  lastSeen?: number;
  hidden?: boolean;
}

export type StreamErrorType =
  | 'CORS_BLOCKED'
  | 'NETWORK_OFFLINE'
  | 'STREAM_DEAD'
  | 'TIMEOUT'
  | 'MEDIA_DECODE'
  | 'UNKNOWN';

export interface Channel {
  group: string;
  name: string;
  logo: string;
  country?: string;
  url: string;
}

export type StreamCategory = 'radio' | 'music_channels' | 'music_audio';
