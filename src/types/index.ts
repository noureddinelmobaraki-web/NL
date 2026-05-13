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
  onShare: () => void;
}

export interface Song {
  id: number;
  title: string;
  url: string;
  lrc: string | null;
  cover?: string;
  backgroundImage?: string;
  sharePath?: string;
}

export interface LyricLine {
  time: number;
  text: string;
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
  }
}
