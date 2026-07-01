import { useEffect } from 'react';
import { useMusicStore } from '../store/musicStore';
import { useAppContext } from '../../../context/AppContext';

const PENDING_SONG_KEY = 'nl:pending-song';

export function useSongDeepLink() {
  const tracks = useMusicStore((s) => s.tracks);
  const playTrack = useMusicStore((s) => s.actions.playTrack);
  const { openMusic } = useAppContext();

  useEffect(() => {
    if (!tracks.length) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('song') || sessionStorage.getItem(PENDING_SONG_KEY);
    if (!raw || !raw.startsWith('fv-')) return;
    const track = tracks.find((t) => t.id === raw);
    if (!track) return;

    openMusic();
    void playTrack(track.id, true); // startAutoplay = true

    // تنظيف المعامل والتخزين حتى لا يُعاد التشغيل
    sessionStorage.removeItem(PENDING_SONG_KEY);
    const u = new URL(window.location.href);
    u.searchParams.delete('song');
    window.history.replaceState({}, '', u.toString());
  }, [tracks, playTrack, openMusic]);
}
