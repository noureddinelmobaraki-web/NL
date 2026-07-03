import type { ReactNode } from 'react';

export type FrameId =
  | 'none' | 'wood' | 'copper' | 'bronze' | 'silver'
  | 'gold' | 'rainbow' | 'neon' | 'emerald' | 'orange';

export const FRAME_IDS: FrameId[] = [
  'none','wood','copper','bronze','silver','gold','rainbow','neon','emerald','orange',
];

export const FRAME_LABELS: Record<FrameId, string> = {
  none: 'No Frame', wood: 'Wood', copper: 'Copper', bronze: 'Bronze',
  silver: 'Silver', gold: 'Gold', rainbow: 'Rainbow', neon: 'Neon',
  emerald: 'Emerald', orange: 'Orange',
};

interface Props { frame?: string | null; size?: number; children: ReactNode; }

/** Wraps an avatar with a frame ring. `frame` falls back to 'none' if unknown. */
export function AvatarFrame({ frame, size = 132, children }: Props) {
  const id = (FRAME_IDS as string[]).includes(frame ?? '') ? (frame as FrameId) : 'none';
  return (
    <div className={`avatar-frame frame-${id}`} style={ { width: size, height: size } }>
      <div className="avatar-frame-inner">{children}</div>
    </div>
  );
}
