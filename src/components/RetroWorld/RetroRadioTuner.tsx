import React, { useEffect, useState } from 'react';
import { Radio, Volume2, VolumeX, ChevronDown, Sparkles, RefreshCw } from 'lucide-react';
import { z } from 'zod';

const RadioStationSchema = z.object({
  stationuuid: z.string(),
  name: z.string(),
  url_resolved: z.string().url(),
  countrycode: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  bitrate: z.number().optional().default(128),
});

const RadioStationsArraySchema = z.array(RadioStationSchema);

export interface RetroStation {
  id: string;
  name: string;
  streamUrl: string;
  isHls?: boolean;
  badge: string;
}

export const DEFAULT_RETRO_STATION: RetroStation = {
  id: 'nl-default-kid-cudi',
  name: 'NL Retro FM — Kid Cudi (By Design)',
  streamUrl:
    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Kid_Cudi_By_Design/Kid_Cudi_By_Design.m3u8',
  isHls: true,
  badge: 'NL Vault',
};

const CURATED_FALLBACK_STATIONS: RetroStation[] = [
  DEFAULT_RETRO_STATION,
  {
    id: 'somafm-synthwave',
    name: 'Nightride FM — Chillsynth & Retro',
    streamUrl: 'https://stream.nightride.fm/chillsynth.m4a',
    badge: 'Synthwave',
  },
  {
    id: 'somafm-groovesalad',
    name: 'SomaFM Groove Salad — Ambient Chill',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    badge: 'Chill',
  },
  {
    id: 'somafm-defcon',
    name: 'SomaFM DEF CON Radio — Hacker Electronic',
    streamUrl: 'https://ice2.somafm.com/defcon-128-mp3',
    badge: 'Retro Tech',
  },
];

type PresetCategory = 'morocco' | 'retro' | 'arabic' | 'jazz';

const CATEGORY_QUERIES: Record<PresetCategory, { label: string; params: string }> = {
  morocco: {
    label: '🇲🇦 المغرب',
    params: 'countrycode=MA&limit=12&order=clickcount&reverse=true&hidebroken=true',
  },
  retro: {
    label: '🕹️ Retro / 80s',
    params: 'tag=80s&limit=12&order=clickcount&reverse=true&hidebroken=true',
  },
  arabic: {
    label: '🎶 طرب وكلاسيك',
    params: 'language=arabic&limit=12&order=clickcount&reverse=true&hidebroken=true',
  },
  jazz: {
    label: '🎷 Jazz / Lo-Fi',
    params: 'tag=jazz&limit=12&order=clickcount&reverse=true&hidebroken=true',
  },
};

const RADIO_BROWSER_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

async function fetchRadioBrowserStations(category: PresetCategory): Promise<RetroStation[]> {
  const query = CATEGORY_QUERIES[category].params;
  for (const host of RADIO_BROWSER_MIRRORS) {
    try {
      const res = await fetch(`${host}/json/stations/search?${query}`);
      if (!res.ok) continue;
      const json = await res.json();
      const parsed = RadioStationsArraySchema.safeParse(json);
      if (!parsed.success) continue;

      const stations = parsed.data
        .filter((s) => s.url_resolved.startsWith('https://'))
        .map((s) => ({
          id: s.stationuuid,
          name: s.name.trim() || 'Live Radio',
          streamUrl: s.url_resolved,
          isHls: s.url_resolved.includes('.m3u8'),
          badge: s.countrycode || `${s.bitrate || 128}k`,
        }));

      if (stations.length > 0) {
        return [DEFAULT_RETRO_STATION, ...stations];
      }
    } catch {
      /* try next mirror */
    }
  }
  return CURATED_FALLBACK_STATIONS;
}

export interface RetroRadioTunerProps {
  currentStation: RetroStation;
  isMuted: boolean;
  onSelectStation: (station: RetroStation) => void;
  onToggleMute: () => void;
}

export const RetroRadioTuner: React.FC<RetroRadioTunerProps> = ({
  currentStation,
  isMuted,
  onSelectStation,
  onToggleMute,
}) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PresetCategory>('morocco');
  const [stations, setStations] = useState<RetroStation[]>(CURATED_FALLBACK_STATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchRadioBrowserStations(category)
      .then((list) => {
        if (!cancelled) setStations(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, category]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleMute}
          className="retro-control-btn hover:scale-105 active:scale-95 transition-transform"
          aria-label={isMuted ? 'Unmute Radio' : 'Mute Radio'}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="retro-control-btn hover:scale-102 active:scale-98 transition-transform"
          aria-expanded={open}
          aria-label="Open Live Radio Tuner"
          style={{
            height: '40px',
            padding: '0 14px',
            borderRadius: '999px',
            background: 'rgba(0, 0, 0, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            maxWidth: '250px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Radio size={15} style={{ color: '#34d399', flexShrink: 0 }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentStation.name}
          </span>
          <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.75 }} />
        </button>
      </div>

      {open && (
        <div
          style={{
            width: 'min(320px, calc(100vw - 40px))',
            maxHeight: '380px',
            borderRadius: '18px',
            background: 'rgba(10, 14, 22, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(18px)',
            padding: '12px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 800,
              color: '#a7f3d0',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} /> Radio Browser Live Tuner
            </span>
            {loading && <RefreshCw size={13} className="animate-spin" />}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(Object.keys(CATEGORY_QUERIES) as PresetCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border:
                    category === cat
                      ? '1px solid rgba(52, 211, 153, 0.7)'
                      : '1px solid rgba(255, 255, 255, 0.14)',
                  background:
                    category === cat ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                }}
              >
                {CATEGORY_QUERIES[cat].label}
              </button>
            ))}
          </div>

          <div
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              maxHeight: '240px',
              paddingRight: '2px',
            }}
          >
            {stations.map((st) => {
              const active = st.id === currentStation.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onSelectStation(st);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: active
                      ? '1px solid rgba(52, 211, 153, 0.65)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {st.name}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      flexShrink: 0,
                    }}
                  >
                    {st.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
