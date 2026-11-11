import React, { useState } from 'react';
import { Music } from 'lucide-react';
import {
  SpacetoonThemeSongCard,
  type SpacetoonOstTrack,
} from './SpacetoonThemeSongCard';
import { SpacetoonOstAudioPlayerDock } from './SpacetoonOstAudioPlayerDock';
import { GlassVectorIcon } from '../../../../components/shared/icons';

export const SPACETOON_OST_TRACKS: SpacetoonOstTrack[] = [
  {
    id: 'ost-conan',
    titleAr: 'شارة المحقق كونان — لا للشر لا',
    seriesTitleAr: 'المحقق كونان',
    vocalistAr: 'رشا رزق وطارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 1998,
    posterUrl: 'https://image.tmdb.org/t/p/w780/fecfa202c32e6be3d0a0c412828.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/Conan.mp3',
    videoEmbedUrl: 'https://archive.org/embed/spacetoon-old-openings-collection',
  },
  {
    id: 'ost-hxh',
    titleAr: 'شارة القناص — قد لمعت عيناه',
    seriesTitleAr: 'القناص (Hunter x Hunter)',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 2003,
    posterUrl: 'https://image.tmdb.org/t/p/w780/ucpgmUR1h5Te1BYegKItoPjOeF7.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/kU98MbVVgi72wzceyrEbClZmMfe.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/AlQannas.mp3',
    videoEmbedUrl: 'https://archive.org/embed/spacetoon-old-openings-collection',
  },
  {
    id: 'ost-remy',
    titleAr: 'شارة دروب ريمي — مرّينا بيكم حمدوا',
    seriesTitleAr: 'دروب ريمي',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب زمردة',
    year: 2001,
    posterUrl: 'https://image.tmdb.org/t/p/w780/8mR0uK7C9aT9w8Q1mZ4nO0Y1j2X.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8mR0uK7C9aT9w8Q1mZ4nO0Y1j2X.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/Remi.mp3',
    videoEmbedUrl: 'https://archive.org/embed/rasha-rizk-spacetoon-songs',
  },
  {
    id: 'ost-romeo',
    titleAr: 'شارة عهد الأصدقاء — حلمنا نهار',
    seriesTitleAr: 'عهد الأصدقاء',
    vocalistAr: 'رشا رزق',
    planetLabelAr: 'كوكب مغامرات',
    year: 2000,
    posterUrl: 'https://image.tmdb.org/t/p/w780/vP9ydN7B1n8bO2r3z5T1K6W9q8Z.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/vP9ydN7B1n8bO2r3z5T1K6W9q8Z.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/AhdAlAsdiqaa.mp3',
    videoEmbedUrl: 'https://archive.org/embed/rasha-rizk-spacetoon-songs',
  },
  {
    id: 'ost-dragonball',
    titleAr: 'شارة دراغون بول زد — رأيت الحقيقة',
    seriesTitleAr: 'دراغون بول زد',
    vocalistAr: 'عاصم سكر وطارق العربي طرقان',
    planetLabelAr: 'كوكب أكشن',
    year: 2002,
    posterUrl: 'https://image.tmdb.org/t/p/w780/6VKOfL6ihwTiB5Vibq6QTfzhxA6.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ydf1CeiBLfdxiyNTpskM0802TKl.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/DragonBallZ.mp3',
    videoEmbedUrl: 'https://archive.org/embed/spacetoon-old-openings-collection',
  },
  {
    id: 'ost-majed',
    titleAr: 'شارة الكابتن ماجد — عاد إليكم من جديد',
    seriesTitleAr: 'الكابتن ماجد',
    vocalistAr: 'بسام الحسوني / طارق العربي طرقان',
    planetLabelAr: 'كوكب رياضة',
    year: 1995,
    posterUrl: 'https://image.tmdb.org/t/p/w780/2f8B9zT4J1p7X3m5K8w9R0q1L2N.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/2f8B9zT4J1p7X3m5K8w9R0q1L2N.jpg',
    audioStreamUrl: 'https://archive.org/download/spacetoon-songs-collection-mp3/CaptainMajed.mp3',
    videoEmbedUrl: 'https://archive.org/embed/spacetoon-old-openings-collection',
  },
];

export const SpacetoonOstGlassStage: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<SpacetoonOstTrack | null>(
    SPACETOON_OST_TRACKS[0]
  );
  const [playMode, setPlayMode] = useState<'audio' | 'video'>('audio');

  const handleSelectTrack = (track: SpacetoonOstTrack, mode: 'audio' | 'video') => {
    setActiveTrack(track);
    setPlayMode(mode);
  };

  const handleStep = (delta: number) => {
    if (!activeTrack) return;
    const idx = SPACETOON_OST_TRACKS.findIndex((t) => t.id === activeTrack.id);
    const nextIdx = (idx + delta + SPACETOON_OST_TRACKS.length) % SPACETOON_OST_TRACKS.length;
    setActiveTrack(SPACETOON_OST_TRACKS[nextIdx]);
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
        {SPACETOON_OST_TRACKS.map((track) => (
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
