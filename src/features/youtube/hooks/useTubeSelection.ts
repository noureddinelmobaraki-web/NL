import { useCallback, useEffect, useMemo, useState } from 'react';
import type { YouTubeVideo } from '../types';

export function useTubeSelection(
  videos: YouTubeVideo[],
  open: boolean,
  initialVideoId?: string,
) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (initialVideoId) { setActiveId(initialVideoId); return; }
    if (videos.length > 0 && !activeId) setActiveId(videos[0].id);
  }, [open, initialVideoId, videos, activeId]);

  const active = useMemo(
    () => videos.find((v) => v.id === activeId) || videos[0],
    [videos, activeId],
  );

  const select = useCallback((id: string) => {
    setActiveId(id);
    const body = document.querySelector('.nl-tube-body');
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { activeId, active, select };
}
