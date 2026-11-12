import { parseM3u, type TvChannel } from '../iptvHelper';

export interface IptvCategoryMeta {
  id: string;
  label: string;
  labelAr: string;
  name?: string;
  nameAr?: string;
  customUrl?: string;
}

export interface EpgNowNextProgram {
  channelId: string;
  nowTitle: string;
  nextTitle: string;
  progressPercent: number;
  categoryLabel: string;
}

export const IPTV_CATEGORIES: IptvCategoryMeta[] = [
  { id: 'all', label: 'All Countries', labelAr: 'حسب الدول' },
  { id: 'morocco', label: 'Morocco (MA)', labelAr: 'المغرب', customUrl: 'https://iptv-org.github.io/iptv/countries/ma.m3u' },
  { id: 'arabic', label: 'Arabic Channels', labelAr: 'القنوات العربية', customUrl: 'https://iptv-org.github.io/iptv/languages/ara.m3u' },
  { id: 'free-tv', label: 'Free-TV Curated HD', labelAr: 'قنوات عالمية مختارة', customUrl: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
  { id: 'news', label: 'World News', labelAr: 'الأخبار العالمية' },
  { id: 'sports', label: 'Sports Live', labelAr: 'الرياضة المباشرة' },
  { id: 'movies', label: 'Cinema & Movies', labelAr: 'أفلام وسينما' },
  { id: 'series', label: 'Series & Drama', labelAr: 'مسلسلات ودراما' },
  { id: 'animation', label: 'Anime & Cartoon', labelAr: 'أنمي وكرتون' },
  { id: 'kids', label: 'Kids & Family', labelAr: 'أطفال وعائلة' },
  { id: 'documentary', label: 'Documentaries', labelAr: 'وثائقيات' },
  { id: 'science', label: 'Science & Space', labelAr: 'علوم وفضاء' },
  { id: 'music', label: 'Music Channels', labelAr: 'موسيقى' },
  { id: 'entertainment', label: 'Entertainment', labelAr: 'ترفيه' },
  { id: 'comedy', label: 'Comedy', labelAr: 'كوميديا' },
  { id: 'religious', label: 'Islamic & Religious', labelAr: 'قنوات دينية وقرآن' },
  { id: 'culture', label: 'Culture & Arts', labelAr: 'ثقافة وفنون' },
  { id: 'cooking', label: 'Cooking & Food', labelAr: 'طبخ ومأكولات' },
  { id: 'travel', label: 'Travel & Nature', labelAr: 'سفر وطبيعة' },
  { id: 'auto', label: 'Motors & Auto', labelAr: 'سيارات ومحركات' },
  { id: 'business', label: 'Business & Finance', labelAr: 'اقتصاد وأعمال' },
  { id: 'weather', label: 'Weather Live', labelAr: 'الطقس المباشر' },
];

export async function fetchChannelsByCategory(categoryId: string): Promise<TvChannel[]> {
  if (!categoryId || categoryId === 'all') return [];
  const meta = IPTV_CATEGORIES.find((c) => c.id === categoryId);
  const url =
    meta?.customUrl ||
    `https://iptv-org.github.io/iptv/categories/${encodeURIComponent(categoryId.toLowerCase())}.m3u`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return parseM3u(text).slice(0, 140);
  } catch {
    return [];
  }
}

export function buildRealtimeEpgSlot(channel: TvChannel | null): EpgNowNextProgram | null {
  if (!channel) return null;
  const now = new Date();
  const minutes = now.getMinutes();
  const progressPercent = Math.min(98, Math.max(6, Math.round(((minutes % 30) / 30) * 100)));
  const group = channel.group || 'Live Broadcast';

  return {
    channelId: channel.id,
    nowTitle: `${channel.name} — البث المباشر (${group})`,
    nextTitle: `البرنامج القادم على ${channel.name}`,
    progressPercent,
    categoryLabel: group,
  };
}
