import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { getFvTracks } from '../../music/data/loadSongs';
import { getInitials } from '../../music/utils/cover';
import { audioManager } from '../../../audio/audioManager';
import { prefetchAudio } from '../../music/data/audioPrefetch';

import { useMusicStore } from '../../music/store/musicStore';

const FULL_VOL = 0.85;   // الصوت الطبيعي عند فتح البروفايل
const LOW_VOL = 0.05;    // عند الخفض: 5% فقط (كان 0.10)

export function ThemeSongBar({
  songId,
  start,
  end,
  canRemove = false,
  onRemove,
}: {
  songId: string | null | undefined;
  start?: number | null;
  end?: number | null;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  const allTracks = useMusicStore((s) => s.tracks);
  const track = songId ? allTracks.find((t) => t.id === songId) || getFvTracks().find((t) => t.id === songId) : undefined;
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [low, setLow] = useState(false);
  const [ready, setReady] = useState(false);
  
  const clipStart = Math.max(0, start ?? 0);
  const clipEnd = end && end > clipStart ? end : null;

  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!track) { setLocalUrl(null); return; }
    // أغنية البروفايل تُشغَّل كاملة من البداية → لا seeking ولا تنزيل كامل.
    // البثّ المباشر من المصدر يضمن جاهزية فورية داخل نافذة تفعيل نقرة الفتح.
    setLocalUrl(track.src);
    prefetchAudio(track.src); // تسخين الكاش فقط (بلا crossOrigin) — تحسين اختياري
  }, [track]);

  // عنصر صوت معزول. بلا crossOrigin (متوافق CORS مثل المحرّك).
  useEffect(() => {
    if (!track || !localUrl) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = localUrl;
    audioRef.current = a;

    // التنسيق يبقى عبر المدير: يوقف NL music ويكبت الخلفية. (register يصفّر الصوت داخليًا)
    audioManager.register('profile', a, low ? LOW_VOL : FULL_VOL);
    audioManager.requestExclusive('profile', 'profile_song');

    // تشغيل مباشر — لا يمرّ عبر playChain حتى لا نفقد تفعيل إيماءة المستخدم.
    const startPlayback = () => {
      try { a.currentTime = clipStart; } catch {}
      a.volume = low ? LOW_VOL : FULL_VOL;   // نضبط الصوت مباشرة (register صفّره)
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setReady(true);
          // مزامنة حالة المدير دون مقاطعة (العنصر يعمل أصلًا → لن يعيد التشغيل)
          audioManager.play('profile').catch(() => {});
        }).catch(() => { /* محجوب — سيُعاد عند أول تفاعل عبر تأثير kick */ });
      } else {
        setReady(true);
      }
    };

    const onReady = () => startPlayback();
    const onTime = () => {
      if (clipEnd != null && a.currentTime >= clipEnd) {
        try { a.currentTime = clipStart; } catch {}
        a.play().catch(() => {});
      }
    };

    a.addEventListener('loadedmetadata', onReady);
    a.addEventListener('loadeddata', onReady);
    a.addEventListener('canplay', onReady);
    a.addEventListener('timeupdate', onTime);
    a.load();
    // محاولة فورية: نافذة تفعيل نقرة فتح البروفايل قد تكون سارية → تشغيل تلقائي حقيقي.
    startPlayback();

    return () => {
      a.removeEventListener('loadedmetadata', onReady);
      a.removeEventListener('loadeddata', onReady);
      a.removeEventListener('canplay', onReady);
      a.removeEventListener('timeupdate', onTime);
      audioManager.stop('profile');
      audioManager.unregister('profile');
      audioManager.releaseExclusive('profile_song');
      try { a.pause(); } catch {}
      a.src = '';
      audioRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, localUrl, clipStart, clipEnd]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = low ? LOW_VOL : FULL_VOL;
  }, [low]);

  // إعادة المحاولة عند تفاعل المستخدم إن حجب المتصفّح التشغيل التلقائي.
  // نُشغّل a.play() مباشرةً (متزامنة داخل الإيماءة) لا عبر playChain المؤجَّلة.
  useEffect(() => {
    if (!track) return;
    const kick = () => {
      const a = audioRef.current;
      if (a && a.paused) {
        a.volume = low ? LOW_VOL : FULL_VOL;
        a.play().then(() => {
          setReady(true);
          audioManager.play('profile').catch(() => {});
        }).catch(() => {});
      }
    };
    // بدون once: يظل يحاول حتى ينجح؛ وبعد التشغيل يصبح no-op (a.paused=false).
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    window.addEventListener('touchend', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchend', kick);
    };
  }, [track, low]);

  const toggleLow = useCallback(() => setLow((v) => !v), []);

  if (!track) return null;

  return (
    <div className="nl-theme-song" dir="rtl">
      <span className="nl-theme-song__cover" style={{ background: track.coverColor }}>
        {track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span>{getInitials(track.title)}</span>}
      </span>
      <span className="nl-theme-song__tube">
        <span className="nl-theme-song__eq" data-on={ready ? 'true' : 'false'}><i /><i /><i /><i /></span>
        <span className="nl-theme-song__name">{track.title}</span>
        <span className="nl-theme-song__artist">{track.artist}</span>
      </span>
      <button className="nl-theme-song__vol" onClick={toggleLow} aria-label={low ? 'رفع الصوت' : 'خفض الصوت إلى 5%'} title={low ? 'رفع الصوت' : 'خفض الصوت إلى 5%'}>
        {low ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      {canRemove && (
        <button className="nl-theme-song__remove" onClick={onRemove} aria-label="إزالة الأغنية" title="إزالة"><X size={15} /></button>
      )}
    </div>
  );
}
