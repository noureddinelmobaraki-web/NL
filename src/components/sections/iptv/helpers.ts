import { StreamItem, Channel } from './types';

export const DEFAULT_PRESET_STREAMS: StreamItem[] = [
  {
    id: 'pr_aloula',
    name: 'Al Aoula HD',
    category: 'music_channels',
    group: 'Morocco',
    logo: 'https://i.imgur.com/Ki3ySUE.png',
    url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8',
    qualities: [{ quality: 'Auto', url: 'https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8' }],
    currentQualityIndex: 0
  },
  {
    id: 'pr_medi1_radio',
    name: 'Medi 1 Radio',
    category: 'radio',
    group: 'Morocco',
    logo: 'https://i.imgur.com/3YsZPY6.jpeg',
    url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3',
    qualities: [{ quality: 'HQ', url: 'https://medi1.ice.infomaniak.ch/medi1-128.mp3' }],
    currentQualityIndex: 0
  }
];

export function parseM3U(raw: string): Channel[] {
  const lines = raw.split('\n');
  const channels: Channel[] = [];
  let current: Partial<Channel> = {};

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const groupMatch  = line.match(/group-title="([^"]+)"/);
      const nameMatch   = line.match(/,(.+)$/);
      const logoMatch   = line.match(/tvg-logo="([^"]+)"/);
      const countryMatch = line.match(/tvg-country="([^"]+)"/);
      current = {
        group:   groupMatch?.[1]  ?? 'Other',
        name:    nameMatch?.[1]   ?? 'Unknown',
        logo:    logoMatch?.[1]   ?? '',
        country: countryMatch?.[1] ?? '',
      };
    } else if (line.startsWith('http') && current.name) {
      channels.push({ ...current, url: line.trim() } as Channel);
      current = {};
    }
  }
  return channels;
}

export function sortSubGroupChips(chips: string[], category: 'radio' | 'music_channels' | 'music_audio'): string[] {
  if (category === 'music_channels') {
    const level1 = chips.filter(g => g === '⭐ Popular' || g.toLowerCase().includes('popular'));
    const level4 = chips.filter(g => g.includes('VOD') || g.includes('📼'));
    
    const level3List = ["📰 News", "🎬 Movies", "🧒 Kids", "🕌 Religious", "⚽ Sports", "💼 Business News", "🎨 Culture", "🎥 Documentary", "🎵 Music", "🎭 Entertainment", "🌦️ Weather", "🎓 Education"];
    const level3Keywords = ["News", "Movies", "Kids", "Religious", "Sports", "Business News", "Culture", "Documentary", "Music", "Entertainment", "Weather", "Education", "📰", "🎬", "🧒", "🕌", "⚽", "💼", "🎨", "🎥", "🎵", "🎭", "🌦️", "🎓"];
    
    const isLevel3 = (g: string) => {
      return level3List.includes(g) || level3Keywords.some(kw => g.includes(kw));
    };
    
    const level3 = chips.filter(g => !level1.includes(g) && !level4.includes(g) && isLevel3(g));
    const level2 = chips.filter(g => !level1.includes(g) && !level4.includes(g) && !level3.includes(g));
    
    return [...level1, ...level2, ...level3, ...level4];
  } else if (category === 'radio') {
    const popular = chips.filter(g => g === '⭐ Popular' || g.toLowerCase().includes('popular'));
    const rest = chips.filter(g => !popular.includes(g));
    return [...popular, ...rest];
  } else {
    return chips;
  }
}

export async function checkStreamHealth(url: string): Promise<'ALIVE' | 'CORS' | 'DEAD'> {
  try {
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(url, { 
        method: 'HEAD', 
        signal: controller.signal, 
        cache: 'no-store' 
      });
    } catch (err: any) {
      clearTimeout(abortTimeout);
      if (err.name === 'AbortError') return 'ALIVE';
      if (err instanceof TypeError) {
        const msg = err.message.toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('load failed')) {
          return 'CORS';
        }
      }
      return 'DEAD';
    }

    clearTimeout(abortTimeout);
    if (response.status === 405) {
      const getController = new AbortController();
      const getAbortTimeout = setTimeout(() => getController.abort(), 5000);
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-0' },
          signal: getController.signal,
          cache: 'no-store'
        });
        clearTimeout(getAbortTimeout);
        return getResponse.ok ? 'ALIVE' : 'DEAD';
      } catch (getErr: any) {
        clearTimeout(getAbortTimeout);
        if (getErr.name === 'AbortError') return 'ALIVE';
        return 'DEAD';
      }
    }
    return response.ok ? 'ALIVE' : 'DEAD';
  } catch (e) {
    return 'DEAD';
  }
}

export const THEME_SKIN = {
  light: {
    windowTitle: 'live_broadcast_deck.exe',
    closedTitle: 'live_broadcast_deck.exe',
    outerBg: '#D8D4CC',
    headerGradient: 'from-zinc-700 to-zinc-500',
    sidebarBg: 'bg-zinc-200',
    sidebarHeader: 'bg-zinc-300',
    listBg: 'bg-zinc-100',
    activePill: 'bg-blue-800 text-white',
    footerBg: 'bg-[#C0C0C0]',
    borderStyle: '2px solid',
    scanlines: true,
    imageFilter: 'none',
  },
  dark: {
    windowTitle: 'broadcast_terminal.sh',
    closedTitle: 'broadcast_terminal.sh',
    outerBg: '#0A0A0A',
    headerGradient: 'from-[#0d0d0d] to-[#1a1a1a]',
    sidebarBg: 'bg-[#0f0f0f]',
    sidebarHeader: 'bg-[#111]',
    listBg: 'bg-[#080808]',
    activePill: 'bg-[#B8FF3F] text-black',
    footerBg: 'bg-[#0d0d0d]',
    borderStyle: '1px solid #333',
    scanlines: true,
    imageFilter: 'brightness(0.7) contrast(1.2) saturate(0)',
  },
  bit: {
    windowTitle: 'RETRO_TV_8BIT.EXE',
    closedTitle: 'RETRO_TV_8BIT.EXE',
    outerBg: '#1a1032',
    headerGradient: 'from-[#2d1b69] to-[#1a0f3c]',
    sidebarBg: 'bg-[#1a1032]',
    sidebarHeader: 'bg-[#2d1b69]',
    listBg: 'bg-[#120b25]',
    activePill: 'bg-[#ff00ff] text-white',
    footerBg: 'bg-[#2d1b69]',
    borderStyle: '2px solid #ff00ff',
    scanlines: true,
    imageFilter: 'hue-rotate(180deg) saturate(2) brightness(0.8)',
  },
  midnight: {
    windowTitle: 'midnight_stream.cfg',
    closedTitle: 'midnight_stream.cfg',
    outerBg: '#0c1929',
    headerGradient: 'from-[#0c1929] to-[#162237]',
    sidebarBg: 'bg-[#0c1929]',
    sidebarHeader: 'bg-[#101f30]',
    listBg: 'bg-[#080f1a]',
    activePill: 'bg-[#3b82f6] text-white',
    footerBg: 'bg-[#0c1929]',
    borderStyle: '1px solid #1e3a5f',
    scanlines: false,
    imageFilter: 'brightness(0.6) saturate(0.5) hue-rotate(200deg)',
  }
};

