// src/features/cinema/player/AdShield.tsx
export interface AdShieldProps {
  active?: boolean;
  onTogglePlay?: () => void;
  onSeekRelative?: (deltaSec: number) => void;
  onToggleFullscreen?: () => void;
  onActivity?: () => void;
  labels?: { armed: string; passThrough: string; passThroughHint: string };
  passThroughMs?: number;
}

export function AdShield(_props: AdShieldProps) {
  return null;
}
