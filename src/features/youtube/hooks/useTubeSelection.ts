import { useCallback, useEffect, useMemo, useState } from 'react';
import type { YouTubeVideo } from '../types';

export function useTubeSelection(
  videos: YouTubeVideo[],
  open: boolean,
  initialVideoId?: string,
) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!open) { setActiveId(''); return; }
    if (initialVideoId) { setActiveId(initialVideoId); }
  }, [open, initialVideoId]);

  const active = useMemo(
    () => videos.find((v) => v.id === activeId),
    [videos, activeId],
  );

  const select = useCallback((id: string) => {
    setActiveId(id);
    const body = document.querySelector('.nl-tube-body');
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clear = useCallback(() => setActiveId(''), []);

  return { activeId, active, select, clear };
}
