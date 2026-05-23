export interface StreamItem {
  id: string;
  name: string;
  category: 'radio' | 'music_channels' | 'music_audio';
  group: string; // Dynamic Group / Country / Genre
  logo: string;
  url: string;
  qualities: { quality: string; url: string }[];
  currentQualityIndex: number;
  failCount?: number;    // how many health checks failed
  lastSeen?: number;     // timestamp of last successful playback
  hidden?: boolean;      // soft-hidden, not deleted
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
