import { useEffect } from 'react';
import { useMusicStore } from '../store/musicStore';
import { useAppContext } from '../../../context/AppContext';

export function useSongDeepLink() {
  const tracks = useMusicStore((s) => s.tracks);
  const playTrack = useMusicStore((s) => s.actions.playTrack);
  const { openMusic } = useAppContext();

  useEffect(() => {
    if (!tracks.length) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('song');
    if (!raw || !raw.startsWith('fv-')) return; // NL Music ids only
    const track = tracks.find((t) => t.id === raw);
    if (!track) return;
    
    openMusic();
    void playTrack(track.id, true); // startAutoplay = true

    // نظّف المعامل حتى لا يُعاد التشغيل عند إعادة الرسم
    const u = new URL(window.location.href);
    u.searchParams.delete('song');
    window.history.replaceState({}, '', u.toString());
  }, [tracks, playTrack, openMusic]);
}
