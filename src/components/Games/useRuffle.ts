import { useEffect, useRef, useState, type RefObject } from 'react';
import { loadRuffle } from '../../utils/ruffleLoader';

type RuffleStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useRuffle(
  containerRef: RefObject<HTMLDivElement | null>,
  swfUrl: string | null,
  reloadToken = 0,
) {
  const [status, setStatus] = useState<RuffleStatus>('idle');
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!swfUrl || !container) { setStatus('idle'); return; }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const Ruffle = await loadRuffle();
        if (cancelled) return;
        const player = Ruffle.newest().createPlayer();
        player.className = 'nl-ruffle-player';
        container.replaceChildren(player);
        playerRef.current = player;

        // توافق مع نسخ Ruffle المختلفة
        const api = typeof player.ruffle === 'function' ? player.ruffle() : player;
        await api.load({
          url: swfUrl,
          autoplay: 'on',
          unmuteOverlay: 'visible',
          letterbox: 'on',
          contextMenu: 'rightClickOnly',
          logLevel: 'error',
        });
        if (cancelled) return;
        try { player.focus?.(); } catch {}
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try { playerRef.current?.remove?.(); } catch {}
      playerRef.current = null;
      try { container.replaceChildren(); } catch {}
    };
  }, [swfUrl, reloadToken, containerRef]);

  return { status, playerRef };
}
