// src/audio/NowPlayingBridge.tsx
// جسر عالمي بلا واجهة: يبثّ المقطع الفعلي من متجر الموسيقى إلى nowPlayingBus
// دائمًا (مركّب مرّة واحدة في جذر التطبيق) → النوتش يعرض الاسم الحقيقي
// والمشغّل يتحكّم فيه من أي صفحة.
import { useEffect } from 'react';
import { useMusicStore } from '../features/music/store/musicStore';
import { selectCurrentTrack } from '../features/music/store/selectors';
import { nowPlayingBus } from './nowPlayingBus';

export function NowPlayingBridge(): null {
  useEffect(() => {
    const controls = {
      toggle: () => useMusicStore.getState().actions.togglePlay(),
      next: () => useMusicStore.getState().actions.next(),
      prev: () => useMusicStore.getState().actions.prev(),
      stop: () => useMusicStore.getState().actions.togglePlay(),
    };
    let lastKey = '';
    const publish = () => {
      const s = useMusicStore.getState();
      const track = selectCurrentTrack(s);
      if (!track) {
        if (lastKey !== '') { lastKey = ''; nowPlayingBus.clear('song'); }
        return;
      }
      const key = `${track.id}|${s.isPlaying ? '1' : '0'}`;
      if (key === lastKey) return;
      lastKey = key;
      nowPlayingBus.publish({
        source: 'song',
        title: track.title,
        subtitle: track.artist,
        artworkUrl: track.coverUrl,
        isPlaying: s.isPlaying,
        canNext: true,
        canPrev: true,
        controls,
      });
    };
    publish();
    const unsub = useMusicStore.subscribe(publish);
    return () => { unsub(); };
  }, []);
  return null;
}
