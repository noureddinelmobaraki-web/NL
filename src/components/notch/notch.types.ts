import type { Theme } from '../../utils/userPrefs';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NotchTransport {
  title: string;
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}

export interface SwitcherMode {
  id: Theme;
  label: string;
  icon: LucideIcon;
}

export interface SwitcherDest {
  id: string;
  label: string;
  title?: string;
  ariaLabel?: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export type NotchDevice = 'desktop' | 'mobile';
export type SwitcherBranch = 'modes' | 'dest';
