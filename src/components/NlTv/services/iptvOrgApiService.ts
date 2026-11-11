import { parseM3u, type TvChannel } from '../iptvHelper';

export interface IptvCategoryMeta {
  id: string;
  name: string;
  nameAr: string;
}

export interface EpgNowNextProgram {
  channelId: string;
  nowTitle: string;
  nextTitle: string;
  progressPercent: number;
  categoryLabel: string;
}

export const IPTV_CATEGORIES: IptvCategoryMeta[] = [
  { id: 'all', name: 'All Channels', nameAr: 'جميع القنوات' },
  { id: 'sports', name: 'Sports', nameAr: 'رياضة' },
  { id: 'news', name: 'News', nameAr: 'إخبارية' },
  { id: 'movies', name: 'Movies', nameAr: 'أفلام' },
  { id: 'kids', name: 'Kids & Animation', nameAr: 'أطفال وكرتون' },
  { id: 'documentary', name: 'Documentary', nameAr: 'وثائقيات' },
  { id: 'music', name: 'Music', nameAr: 'موسيقى' },
  { id: 'entertainment', name: 'Entertainment', nameAr: 'ترفيه عام' },
];

const CATEGORY_CACHE_TTL = 1000 * 60 * 60 * 3;

export async function fetchChannelsByCategory(categoryId: string): Promise<TvChannel[]> {
  const cat = categoryId.toLowerCase();
  const cacheKey = `nltv_cat_${cat}_v1`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.time < CATEGORY_CACHE_TTL && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }
  } catch {
    // ignore storage errors
  }

  try {
    const res = await fetch(`https://iptv-org.github.io/iptv/categories/${cat}.m3u`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m3uText = await res.text();
    const channels = parseM3u(m3uText).slice(0, 160);
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: channels }));
    } catch {
      // ignore quota errors
    }
    return channels;
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
