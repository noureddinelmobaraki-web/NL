import type { TvChannel } from '../iptvHelper';

export interface StremioLiveChannel extends TvChannel {
  addonSource: string;
  description?: string;
}

const CURATED_STREMIO_STREAMS: StremioLiveChannel[] = [
  {
    id: 'stremio-nasa-tv',
    name: 'NASA TV Public UHD',
    group: 'Science & Space',
    addonSource: 'USA TV Addon',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
  },
  {
    id: 'stremio-aljazeera-ar',
    name: 'الجزيرة مباشر HD',
    group: 'Arabic News',
    addonSource: 'Arabic Live Addon',
    logo: 'https://flagcdn.com/qa.svg',
    url: 'https://live-hls-web-aja.getaj.net/AJA/index.m3u8',
  },
  {
    id: 'stremio-alarabiya',
    name: 'العربية HD',
    group: 'Arabic News',
    addonSource: 'Arabic Live Addon',
    logo: 'https://flagcdn.com/sa.svg',
    url: 'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8',
  },
  {
    id: 'stremio-france24-ar',
    name: 'فرانس 24 عربي',
    group: 'International News',
    addonSource: 'Global TV Addon',
    logo: 'https://flagcdn.com/fr.svg',
    url: 'https://live.france24.com/hls/live/2037222-b/F24_AR_HI_HLS/master.m3u8',
  },
  {
    id: 'stremio-dw-ar',
    name: 'DW عربية HD',
    group: 'Documentary & News',
    addonSource: 'Global TV Addon',
    logo: 'https://flagcdn.com/de.svg',
    url: 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/index.m3u8',
  },
  {
    id: 'stremio-redbull-tv',
    name: 'Red Bull TV Sports HD',
    group: 'Sports & Extreme',
    addonSource: 'Sports Live Addon',
    logo: 'https://flagcdn.com/at.svg',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
  },
];

export async function fetchStremioLiveCatalog(): Promise<StremioLiveChannel[]> {
  return CURATED_STREMIO_STREAMS;
}
