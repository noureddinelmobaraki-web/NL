import { useEffect } from 'react';
import { PlayerScreen } from './PlayerScreen';

export function NowPlayingOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] flex flex-col bg-gradient-to-b from-[#FFE8D6] via-[#FFF4EC] to-[#E8FBF2] animate-[nlpUp_0.25s_ease-out]">
      <div className="flex-1 min-h-0">
        <PlayerScreen onClose={onClose} />
      </div>
    </div>
  );
}

export default NowPlayingOverlay;
