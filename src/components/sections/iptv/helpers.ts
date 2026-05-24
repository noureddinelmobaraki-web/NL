// src/components/sections/iptv/helpers.ts

import { StreamItem, Channel } from './types';

// ── Default streams مضمونة تعمل (تظهر فوراً قبل M3U fetch)
export const DEFAULT_PRESET_STREAMS: StreamItem[] = [
  {
    id: 'pr_aloula',
    name: 'Al Aoula HD',
    category: 'music_channels',
    group: '🇲🇦 Morocco',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Al_Aoula_Logo.svg/120px-Al_Aoula_Logo.svg.png',
    url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8',
    qualities: [{ quality: 'Auto', url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8' }],
    currentQualityIndex: 0,
    failCount: 0,
    hidden: false,
  },
  {
    id: 'pr_medi1tv',
    name: 'Medi 1 TV',
    category: 'music_channels',
    group: '🇲🇦 Morocco',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Medi1tv.svg/120px-Medi1tv.svg.png',
    url: 'https://streaming.medi1tv.com/live/smil:medi1tv-fr.smil/playlist.m3u8',
    qualities: [{ quality: 'Auto', url: 'https://streaming.medi1tv.com/live/smil:medi1tv-fr.smil/playlist.m3u8' }],
    currentQualityIndex: 0,
    failCount: 0,
    hidden: false,
  },
  {
    id: 'pr_medi1radio',
    name: 'Medi 1 Radio',
    category: 'radio',
    group: '🇲🇦 Morocco',
    logo: 'https://i.imgur.com/3YsZPY6.jpeg',
    url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3',
    qualities: [{ quality: 'HQ 128kbps', url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3' }],
    currentQualityIndex: 0,
    failCount: 0,
    hidden: false,
  },
  {
    id: 'pr_radio_mars',
    name: 'Radio Mars',
    category: 'radio',
    group: '🇲🇦 Morocco',
    logo: 'https://i.imgur.com/3YsZPY6.jpeg',
    url: 'https://broadcast.infomaniak.ch/radiomars-high.aac',
    qualities: [{ quality: 'HQ', url: 'https://broadcast.infomaniak.ch/radiomars-high.aac' }],
    currentQualityIndex: 0,
    failCount: 0,
    hidden: false,
  },
];

// ── parseM3U: يعالج Windows \r\n + Mac \r + Unix \n
export function parseM3U(raw: string): Channel[] {
  // الإصلاح الجوهري: نظّف \r قبل الـ split
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const channels: Channel[] = [];
  let current: Partial<Channel> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const groupMatch   = line.match(/group-title="([^"]+)"/);
      const nameMatch    = line.match(/,(.+)$/);
      const logoMatch    = line.match(/tvg-logo="([^"]+)"/);
      const countryMatch = line.match(/tvg-country="([^"]+)"/);
      current = {
        group:   groupMatch?.[1]?.trim()   ?? 'Other',
        name:    nameMatch?.[1]?.trim()    ?? 'Unknown',
        logo:    logoMatch?.[1]?.trim()    ?? '',
        country: countryMatch?.[1]?.trim() ?? '',
      };
    } else if ((line.startsWith('http://') || line.startsWith('https://')) && current.name) {
      channels.push({ ...current, url: line } as Channel);
      current = {};
    }
  }
  return channels;
}

// ── buildCategoryList: "⭐ Popular" دائماً أول
export function buildCategoryList(channels: Channel[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  if (channels.some(c => c.group === '⭐ Popular')) {
    ordered.push('⭐ Popular');
    seen.add('⭐ Popular');
  }

  for (const ch of channels) {
    if (!seen.has(ch.group)) {
      ordered.push(ch.group);
      seen.add(ch.group);
    }
  }
  return ordered;
}

// ── sortSubGroupChips: ترتيب مخصص لكل تبويب
export function sortSubGroupChips(
  chips: string[],
  category: 'radio' | 'music_channels' | 'music_audio'
): string[] {
  if (category === 'music_channels') {
    // Level 1: Popular
    const level1 = chips.filter(g =>
      g === '⭐ Popular' || g.toLowerCase().includes('popular')
    );
    // Level 4: VOD
    const level4 = chips.filter(g =>
      g.includes('VOD') || g.includes('📼')
    );
    // Level 3: Topics (بالأيقونات أو الكلمات)
    const topicKeywords = [
      'News', 'Movies', 'Kids', 'Religious', 'Sports',
      'Business', 'Culture', 'Documentary', 'Music',
      'Entertainment', 'Weather', 'Education',
      '📰', '🎬', '🧒', '🕌', '⚽', '💼', '🎨', '🎥', '🎵', '🎭', '🌦️', '🎓',
    ];
    const level3 = chips.filter(g =>
      !level1.includes(g) &&
      !level4.includes(g) &&
      topicKeywords.some(kw => g.includes(kw))
    );
    // Level 2: Countries (ما تبقى)
    const level2 = chips.filter(g =>
      !level1.includes(g) && !level4.includes(g) && !level3.includes(g)
    );
    return [...level1, ...level2, ...level3, ...level4];

  } else if (category === 'radio') {
    const popular = chips.filter(g =>
      g === '⭐ Popular' || g.toLowerCase().includes('popular')
    );
    return [...popular, ...chips.filter(g => !popular.includes(g))];

  } else {
    // music_audio: ترتيب الظهور في الملف (بدون تغيير)
    return chips;
  }
}

// ── THEME_SKIN: ثيمات واجهة التلفاز
export const THEME_SKIN = {
  light: {
    windowTitle:     'live_broadcast_deck.exe',
    outerBg:         '#D8D4CC',
    headerGradient:  'from-zinc-700 to-zinc-500',
    sidebarBg:       'bg-zinc-200',
    listBg:          'bg-zinc-100',
    activePill:      'bg-blue-800 text-white',
    footerBg:        '#C0C0C0',
    borderStyle:     '2px solid #999',
    chipInactive:    'bg-zinc-300 text-zinc-700 hover:bg-zinc-400',
  },
  dark: {
    windowTitle:     'broadcast_terminal.sh',
    outerBg:         '#0A0A0A',
    headerGradient:  'from-[#0d0d0d] to-[#1a1a1a]',
    sidebarBg:       'bg-[#0f0f0f]',
    listBg:          'bg-[#080808]',
    activePill:      'bg-[#B8FF3F] text-black',
    footerBg:        '#0d0d0d',
    borderStyle:     '1px solid #333',
    chipInactive:    'bg-[#1a1a1a] text-zinc-400 hover:bg-[#222]',
  },
  bit: {
    windowTitle:     'RETRO_TV_8BIT.EXE',
    outerBg:         '#1a1032',
    headerGradient:  'from-[#2d1b69] to-[#1a0f3c]',
    sidebarBg:       'bg-[#1a1032]',
    listBg:          'bg-[#120b25]',
    activePill:      'bg-[#ff00ff] text-white',
    footerBg:        '#2d1b69',
    borderStyle:     '2px solid #ff00ff',
    chipInactive:    'bg-[#2d1b69] text-purple-300 hover:bg-[#3d2b79]',
  },
  midnight: {
    windowTitle:     'midnight_stream.cfg',
    outerBg:         '#0c1929',
    headerGradient:  'from-[#0c1929] to-[#162237]',
    sidebarBg:       'bg-[#0c1929]',
    listBg:          'bg-[#080f1a]',
    activePill:      'bg-[#3b82f6] text-white',
    footerBg:        '#0c1929',
    borderStyle:     '1px solid #1e3a5f',
    chipInactive:    'bg-[#0c1929] text-blue-400 hover:bg-[#162237]',
  },
} as const;
