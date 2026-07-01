import { useEffect, useState } from 'react';
import { useMusicStore } from './store/musicStore';
import { useMusicEngine } from './hooks/useMusicEngine';
import { useHotkeys } from './hooks/useHotkeys';
import { useSongDeepLink } from './hooks/useSongDeepLink';
import { fetchLyrics, prefetchMany } from './data/lyrics';
import { listSavedUrls, ensurePersistentStorage } from './data/offline';
import { SongList } from './components/SongList';
import { PlayerScreen } from './components/PlayerScreen';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingOverlay } from './components/NowPlayingOverlay';
import styles from './music.module.css';

export default function MusicPage() {
  useMusicEngine(); // يربط المحرّك بالمتجر (دون الاشتراك في currentTime هنا)
  useHotkeys();    // اختصارات لوحة المفاتيح
  useSongDeepLink(); // معالجة الروابط العميقة للأغاني

  const hasCurrent = useMusicStore((s) => Boolean(s.currentId));
  const currentId = useMusicStore((s) => s.currentId);

  const [isMobile, setIsMobile] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  useEffect(() => {
    // تحديد ما إذا كان الجهاز محمولاً بناءً على عرض الشاشة
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensurePersistentStorage();
      const urls = await listSavedUrls();
      if (cancelled) return;
      const tracks = useMusicStore.getState().tracks;
      const ids = tracks
        .filter((t) => urls.includes(t.src) || (t.srcFallback && urls.includes(t.srcFallback)))
        .map((t) => t.id);
      useMusicStore.getState().actions.setDownloaded(ids);
    })();
    return () => { cancelled = true; };
  }, []);

  // Layer 1 (reliable): whenever the current track changes, fetch its lyrics now.
  useEffect(() => {
    if (!currentId) return;
    const track = useMusicStore.getState().tracks.find((t) => t.id === currentId);
    if (track) fetchLyrics(track);
  }, [currentId]);

  // Layer 2: on open, prefetch lyrics for songs the user interacts with
  // (favorites + recently played). Bounded set — do NOT prefetch the whole catalog.
  useEffect(() => {
    const s = useMusicStore.getState();
    const byId = new Map(s.tracks.map((t) => [t.id, t]));
    const ids = Array.from(new Set([...s.favorites, ...s.history]));
    const interacted = ids.map((id) => byId.get(id)).filter(Boolean) as typeof s.tracks;
    if (interacted.length) prefetchMany(interacted);
  }, []);

  return (
    <div className={'h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#FFE8D6] via-[#FFF4EC] to-[#E8FBF2] ' + styles['nlp-root']}>
      {/* سطح مكتبي: عمودان — القائمة يساراً، المشغّل يميناً */}
      <div className="hidden lg:grid grid-cols-[minmax(360px,1fr)_minmax(380px,520px)] gap-4 h-full p-4">
        <div className="h-full min-h-0">
          <SongList />
        </div>
        <div className="h-full bg-white/20 backdrop-blur-xl border border-white/40 rounded-3xl overflow-hidden shadow-2xl">
          <PlayerScreen />
        </div>
      </div>

      {/* الهاتف: القائمة + شريط مصغّر + طبقة تشغيل */}
      <div className="lg:hidden flex flex-col h-full p-3 pb-0">
        <div className="flex-1 min-h-0">
          <SongList onOpenPlayer={() => setNowPlayingOpen(true)} />
        </div>
        {hasCurrent && !nowPlayingOpen && (
          <div className="shrink-0 py-2">
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
