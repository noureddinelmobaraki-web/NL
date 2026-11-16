import { useEffect, useState } from 'react';
import { useMusicStore } from './store/musicStore';
import { useHotkeys } from './hooks/useHotkeys';
import { useSongDeepLink } from './hooks/useSongDeepLink';
import { fetchLyrics, prefetchMany } from './data/lyrics';
import { listSavedUrls, ensurePersistentStorage } from './data/offline';
import { SongList } from './components/SongList';
import { PlayerScreen } from './components/PlayerScreen';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingOverlay } from './components/NowPlayingOverlay';
import styles from './music.module.css';
import { songSurfaceBus } from '../../audio/songSurfaceBus';

export default function MusicPage() {
  useHotkeys();    // اختصارات لوحة المفاتيح
  useSongDeepLink(); // معالجة الروابط العميقة للأغاني

  // إعلان "سطح أغنية معروض" → النوتش يعرض نسخة مصغّرة (اسم فقط) هنا، والمشغّل الكامل في بقية الصفحات.
  useEffect(() => songSurfaceBus.enter(), []);

  const hasCurrent = useMusicStore((s) => Boolean(s.currentId));
  const currentId = useMusicStore((s) => s.currentId);
  const allTracks = useMusicStore((s) => s.tracks);

  const [isMobile, setIsMobile] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  useEffect(() => {
    // تحديد ما إذا كان الجهاز محمولاً بناءً على عرض الشاشة
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [allTracks]); // Re-run when allTracks arrive

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensurePersistentStorage();
      const urls = await listSavedUrls();
      if (cancelled) return;
      const tracks = allTracks;
      const ids = tracks
        .filter((t) => urls.includes(t.src) || (t.srcFallback && urls.includes(t.srcFallback)))
        .map((t) => t.id);
      useMusicStore.getState().actions.setDownloaded(ids);
    })();
    return () => { cancelled = true; };
  }, [allTracks]);

  // Layer 1 (reliable): whenever the current track changes, fetch its lyrics now.
  useEffect(() => {
    if (!currentId) return;
    const track = allTracks.find((t) => t.id === currentId);
    if (track) fetchLyrics(track);
  }, [currentId, allTracks]);

  // Layer 2: on open, prefetch lyrics for songs the user interacts with
  // (favorites + recently played). Bounded set — do NOT prefetch the whole catalog.
  useEffect(() => {
    const s = useMusicStore.getState();
    const byId = new Map(allTracks.map((t) => [t.id, t]));
    const ids = Array.from(new Set([...s.favorites, ...s.history]));
    const interacted = ids.map((id) => byId.get(id)).filter(Boolean) as typeof allTracks;
    if (interacted.length) prefetchMany(interacted);
  }, [allTracks]);

  return (
    <div className={'nl-music-root h-[100dvh] w-full overflow-hidden ' + styles['nlp-root']}>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(360px,1fr)_minmax(380px,520px)] lg:gap-4 h-full p-3 pb-0 lg:p-4">
        <div className="nl-music-list-panel flex-1 lg:h-full min-h-0 lg:p-3 lg:rounded-3xl overflow-hidden">
          <SongList onOpenPlayer={isMobile ? () => setNowPlayingOpen(true) : undefined} />
        </div>
        <div className="hidden lg:block nl-music-player-panel h-full rounded-3xl overflow-hidden shadow-2xl">
          <PlayerScreen />
        </div>
        {isMobile && hasCurrent && !nowPlayingOpen && (
          <div className="lg:hidden shrink-0 py-2">
            <MiniPlayer onOpen={() => setNowPlayingOpen(true)} />
          </div>
        )}
      </div>

      {isMobile && (
        <NowPlayingOverlay open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />
      )}
    </div>
  );
}
