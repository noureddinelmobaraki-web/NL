import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ActiveSong {
  id: number;
  title: string;
  cover?: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  suppressMiniBar?: boolean;
  isShuffle: boolean;
  onShuffleToggle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  onRepeatToggle: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  nextSongs?: { id: number; title: string; cover?: string }[];
}

export interface Song {
  id: number;
  title: string;
  url: string;
  lrc: string | null;
  cover?: string;
  backgroundImage?: string;
}

export interface LyricWord {
  text: string;
  time: number;
  endTime?: number;
}

export interface LyricLine {
  time: number;
  text: string;
  words?: LyricWord[];
  endTime?: number;
}

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StreamingPlatform {
  name: string;
  url: string;
  icon: LucideIcon;
  color: string;
  isSpotify?: boolean;
}

export interface SocialChannel {
  name: string;
  url: string;
  icon: LucideIcon;
  color: string;
}

export interface ContactMethod {
  name: string;
  value: string;
  url: string;
  icon: LucideIcon;
  bg: string;
  color: string;
}

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __nl_bot_detected?: boolean;
    requestIdleCallback(
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ): number;
  }

  interface Navigator {
    webdriver?: boolean;
    deviceMemory?: number;
    connection?: {
      effectiveType?: '2g' | 'slow-2g' | '3g' | '4g';
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
    standalone?: boolean;
  }

  interface ScreenOrientation {
    lock(orientation: string): Promise<void>;
    unlock(): void;
  }

  interface HTMLAudioElement {
    __analyser?: AnalyserNode | {
      frequencyBinCount: number;
      getByteFrequencyData: (out: Uint8Array) => void;
    };
  }
}
