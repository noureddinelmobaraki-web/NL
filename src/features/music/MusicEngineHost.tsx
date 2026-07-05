import { useMusicEngine } from './hooks/useMusicEngine';

/**
 * مضيف المحرّك على مستوى الجذر: يُركّب مرّة واحدة قرب جذر التطبيق (مثل NowPlayingBridge)
 * فيبقى محرّك الموسيقى موصولًا بالمتجر عبر كل الصفحات. بفضل هذا لا تتوقّف الأغنية
 * الظاهرة في النوتش عند التنقّل — تستمر حتى يوقفها المستخدم من النوتش.
 */
export function MusicEngineHost(): null {
  useMusicEngine();
  return null;
}

export default MusicEngineHost;
