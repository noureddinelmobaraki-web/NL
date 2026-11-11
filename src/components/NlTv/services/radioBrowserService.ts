export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
}

const RADIO_MIRRORS = [
  'https://de1.api.radio-browser.info/json',
  'https://fr1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
];

const FALLBACK_STATIONS: RadioStation[] = [
  {
    stationuuid: 'ma-medi1-radio',
    name: 'Medi 1 Radio Maghreb',
    url_resolved: 'https://live.medi1.com/medi1',
    favicon: 'https://flagcdn.com/ma.svg',
    tags: 'news,talk,maghreb,arabic',
    country: 'Morocco',
    countrycode: 'MA',
    language: 'arabic',
    codec: 'MP3',
    bitrate: 128,
    votes: 1250,
  },
  {
    stationuuid: 'qa-quran-radio',
    name: 'إذاعة القرآن الكريم',
    url_resolved: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
    favicon: 'https://flagcdn.com/sa.svg',
    tags: 'quran,islamic,arabic',
    country: 'Saudi Arabia',
    countrycode: 'SA',
    language: 'arabic',
    codec: 'AAC',
    bitrate: 128,
    votes: 3400,
  },
  {
    stationuuid: 'fr-fip-radio',
    name: 'FIP Radio Paris',
    url_resolved: 'https://icecast.radiofrance.fr/fip-midfi.mp3',
    favicon: 'https://flagcdn.com/fr.svg',
    tags: 'eclectic,jazz,chill,lofi',
    country: 'France',
    countrycode: 'FR',
    language: 'french',
    codec: 'MP3',
    bitrate: 128,
    votes: 2900,
  },
  {
    stationuuid: 'us-soma-groovesalad',
    name: 'SomaFM Groove Salad',
    url_resolved: 'https://ice2.somafm.com/groovesalad-128-mp3',
    favicon: 'https://flagcdn.com/us.svg',
    tags: 'ambient,chillout,downtempo',
    country: 'United States',
    countrycode: 'US',
    language: 'english',
    codec: 'MP3',
    bitrate: 128,
    votes: 5200,
  },
];

export async function fetchRadioStationsByCountry(countryCode: string): Promise<RadioStation[]> {
  const code = (countryCode || 'MA').toUpperCase();
  const cacheKey = `nltv_radio_${code}_v1`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.time < 1000 * 60 * 60 * 4 && parsed.data?.length) {
        return parsed.data;
      }
    }
  } catch {
    // ignore storage errors
  }

  for (const base of RADIO_MIRRORS) {
    try {
      const res = await fetch(
        `${base}/stations/bycountrycodeexact/${encodeURIComponent(code)}?limit=60&order=votes&reverse=true&hidebroken=true`
      );
      if (!res.ok) continue;
      const raw: any[] = await res.json();
      const stations: RadioStation[] = raw
        .filter((s) => s.url_resolved && s.name && String(s.url_resolved).startsWith('https://'))
        .map((s) => ({
          stationuuid: s.stationuuid || `${code}-${s.name}`,
          name: String(s.name).trim(),
          url_resolved: s.url_resolved,
          favicon: s.favicon || '',
          tags: s.tags || 'live radio',
          country: s.country || code,
          countrycode: (s.countrycode || code).toUpperCase(),
          language: s.language || '',
          codec: s.codec || 'MP3',
          bitrate: Number(s.bitrate) || 128,
          votes: Number(s.votes) || 0,
        }));

      if (stations.length > 0) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: stations }));
        } catch {
          // ignore
        }
        return stations;
      }
    } catch {
      // try next mirror
    }
  }

  return FALLBACK_STATIONS;
}
