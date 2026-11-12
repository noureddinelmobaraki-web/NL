import React, { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import {
  SpacetoonThemeSongCard,
  type SpacetoonOstTrack,
} from './SpacetoonThemeSongCard';
import { SpacetoonOstAudioPlayerDock } from './SpacetoonOstAudioPlayerDock';
import { GlassVectorIcon } from '../../../../components/shared/icons';

export type { SpacetoonOstTrack };

export const SPACETOON_OST_TRACKS: SpacetoonOstTrack[] = [
  {
    id: 'ost-remi',
    titleAr: 'شارة دروب ريمي — مرّينا بيكم حمدوا',
    showAr: 'دروب ريمي',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب زمردة',
    seriesTitleAr: 'دروب ريمي',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب زمردة',
    year: 2001,
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ريمي', 'remi'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/01.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/01.mp3',
    videoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
  },
  {
    id: 'ost-hxh',
    titleAr: 'شارة القناص — قد لمعت عيناه',
    showAr: 'القناص (Hunter x Hunter)',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'القناص (Hunter x Hunter)',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 2003,
    posterUrl: 'https://image.tmdb.org/t/p/w500/ucpgmUR1h5Te1BYegKItoPjOeF7.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w500/ucpgmUR1h5Te1BYegKItoPjOeF7.jpg',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['القناص', 'قناص', 'hunter'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/02.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/02.mp3',
    videoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
  },
  {
    id: 'ost-conan',
    titleAr: 'شارة المحقق كونان — لا للشر لا',
    showAr: 'المحقق كونان',
    performerAr: 'رشا رزق وطارق العربي طرقان',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'المحقق كونان',
    vocalistAr: 'رشا رزق وطارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 1998,
    posterUrl: 'https://archive.org/services/img/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    backdropUrl: 'https://archive.org/services/img/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    archiveId: 'hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    matchKeywords: ['كونان', 'conan'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/03.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/03.mp3',
    videoEmbedUrl: 'https://archive.org/embed/hsrya-o-laol-mr-brnamg-konan-aal-alhoaaa-2000-2',
  },
  {
    id: 'ost-captain-majid',
    titleAr: 'شارة الكابتن ماجد — عاد إليكم من جديد',
    showAr: 'الكابتن ماجد',
    performerAr: 'طارق العربي طرقان',
    planetBadgeAr: 'كوكب رياضة',
    seriesTitleAr: 'الكابتن ماجد',
    vocalistAr: 'طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 2000,
    posterUrl: 'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    backdropUrl: 'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['ماجد', 'الشبح', 'majid'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/04.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/04.mp3',
    videoEmbedUrl: 'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
  {
    id: 'ost-romeo',
    titleAr: 'شارة عهد الأصدقاء — حكاية روميو',
    showAr: 'عهد الأصدقاء',
    performerAr: 'رشا رزق',
    planetBadgeAr: 'كوكب مغامرات',
    seriesTitleAr: 'عهد الأصدقاء',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 2000,
    posterUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    backdropUrl: 'https://archive.org/services/img/20210811_20210811_2250',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['عهد', 'الأصدقاء', 'روميو'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/05.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/05.mp3',
    videoEmbedUrl: 'https://archive.org/embed/20210811_20210811_2250',
  },
  {
    id: 'ost-digimon',
    titleAr: 'شارة أبطال الديجيتال — في فخ غريب وقعنا',
    showAr: 'أبطال الديجيتال',
    performerAr: 'طارق العربي طرقان ورشا رزق',
    planetBadgeAr: 'كوكب أكشن',
    seriesTitleAr: 'أبطال الديجيتال',
    vocalistAr: 'طارق العربي طرقان ورشا رزق',
    planetLabelAr: 'كوكب أكشن',
    year: 2001,
    posterUrl: 'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    backdropUrl: 'https://archive.org/services/img/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    archiveId: '20210811_20210811_2250',
    matchKeywords: ['الديجيتال', 'ديجيتال', 'digimon'],
    fallbackAudioUrl: 'https://archive.org/download/20210811_20210811_2250/06.mp3',
    fallbackVideoEmbedUrl: 'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
    audioStreamUrl: 'https://archive.org/download/20210811_20210811_2250/06.mp3',
    videoEmbedUrl: 'https://archive.org/embed/mnoaaat-msgl-mn-asbys-ton-aal-alnayl-sat-2002',
  },
];

export const SpacetoonOstGlassStage: React.FC = () => {
  const [tracks, setTracks] = useState<SpacetoonOstTrack[]>(SPACETOON_OST_TRACKS);
  const [activeTrack, setActiveTrack] = useState<SpacetoonOstTrack | null>(
    SPACETOON_OST_TRACKS[0]
  );
  const [playMode, setPlayMode] = useState<'audio' | 'video'>('audio');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          'https://archive.org/metadata/20210811_20210811_2250',
          { signal: AbortSignal.timeout(8500) }
        );
        if (!res.ok) return;
        const data = await res.json();
        const files: Array<{ name?: string }> = Array.isArray(data?.files)
          ? data.files
          : [];
        const mp3Files = files.filter(
          (f) => typeof f?.name === 'string' && f.name.toLowerCase().endsWith('.mp3')
        );
        if (mp3Files.length === 0 || cancelled) return;

        const resolvedTracks = SPACETOON_OST_TRACKS.map((track, idx) => {
          const matchedFile =
            mp3Files.find((f) => {
              const lowerName = String(f.name || '').toLowerCase();
              return track.matchKeywords.some((kw) =>
                lowerName.includes(kw.toLowerCase())
              );
            }) || mp3Files[idx % mp3Files.length];

          if (!matchedFile?.name) return track;
          const resolvedUrl = `https://archive.org/download/20210811_20210811_2250/${encodeURIComponent(
            matchedFile.name
          )}`;
          return {
            ...track,
            audioStreamUrl: resolvedUrl,
            fallbackAudioUrl: resolvedUrl,
          };
        });

        setTracks(resolvedTracks);
        setActiveTrack((prev) => {
          if (!prev) return null;
          return resolvedTracks.find((t) => t.id === prev.id) || prev;
        });
      } catch {
        // Keep static fallback URLs
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTrack = (track: SpacetoonOstTrack, mode: 'audio' | 'video') => {
    setActiveTrack(track);
    setPlayMode(mode);
  };

  const handleStep = (delta: number) => {
    if (!activeTrack) return;
    const idx = tracks.findIndex((t) => t.id === activeTrack.id);
    const nextIdx = (idx + delta + tracks.length) % tracks.length;
    setActiveTrack(tracks[nextIdx]);
  };

  return (
    <section className="px-4 sm:px-10 py-6 space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <GlassVectorIcon icon={Music} theme="emerald" size={20} active />
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              شارات وأغاني سبيستون الخالدة (استماع صوتي أو مشاهدة الفيديو)
            </h2>
            <p className="text-xs text-slate-300">
              روائع رشا رزق وطارق العربي طرقان مع البوستر الأصلي وإمكانية التبديل بين وضع الصوت أو كليب الشارة
            </p>
          </div>
        </div>
      </div>

      <SpacetoonOstAudioPlayerDock
        track={activeTrack}
        mode={playMode}
        onModeChange={setPlayMode}
        onPrev={() => handleStep(-1)}
        onNext={() => handleStep(1)}
        onClose={() => setActiveTrack(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <SpacetoonThemeSongCard
            key={track.id}
            track={track}
            isActive={activeTrack?.id === track.id}
            activeMode={playMode}
            onSelectTrack={handleSelectTrack}
          />
        ))}
      </div>
    </section>
  );
};
