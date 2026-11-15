import { searchArchiveCatalog } from '../../../services/archive/archiveMasterEngine';
import { buildArchiveThumbnailUrl } from '../../../services/archive/archiveUrlBuilder';
import type { CartoonSeriesItem } from '../types/cartoon.types';

export const VINTAGE_GLOBAL_SEEDED_CARTOONS: CartoonSeriesItem[] = [
  {
    id: 'vg-fleischer-superman-1941',
    titleAr: 'سوبرمان الكلاسيكي (استوديوهات فلايشر 1941 - نسخة 35mm)',
    titleEn: 'Fleischer Superman Theatrical Cartoons (1941)',
    planet: 'global',
    planetLabelAr: 'أرشيف الكرتون الكلاسيكي العالمي',
    studio: 'أرشيف الكرتون الكلاسيكي العالمي',
    year: 1941,
    rating: 9.4,
    episodesCount: 17,
    synopsisAr: 'السلسلة السينمائية الأسطورية لسوبرمان من إنتاج استوديوهات ماكس فلايشر عام 1941 بألوان تكنيكولور.',
    posterUrl: 'https://archive.org/services/img/superman_1941',
    backdropUrl: 'https://archive.org/services/img/superman_1941',
    mediaType: 'tv',
    archiveIds: ['superman_1941'],
  },
  {
    id: 'vg-popeye-classic-vault',
    titleAr: 'باباي رجل البحار (روائع العصر الذهبي للكرتون)',
    titleEn: 'Popeye the Sailor Classic Theatrical Shorts',
    planet: 'global',
    planetLabelAr: 'أرشيف الكرتون الكلاسيكي العالمي',
    studio: 'أرشيف الكرتون الكلاسيكي العالمي',
    year: 1936,
    rating: 9.2,
    episodesCount: 20,
    synopsisAr: 'مغامرات البحار باباي وزيتونة وبلوتو من أرشيف الرسوم المتحركة السينمائية الكلاسيكية.',
    posterUrl: 'https://archive.org/services/img/popeye_the_sailor_meets_sindbad_the_sailor',
    backdropUrl: 'https://archive.org/services/img/popeye_the_sailor_meets_sindbad_the_sailor',
    mediaType: 'tv',
    archiveIds: ['popeye_the_sailor_meets_sindbad_the_sailor'],
  },
  {
    id: 'vg-betty-boop-felix-vault',
    titleAr: 'القط فيليكس وبيتي بوب ووودي نقار الخشب (أرشيف 35mm)',
    titleEn: 'Classic Cartoons Vault: Felix the Cat, Betty Boop & Woody Woodpecker',
    planet: 'global',
    planetLabelAr: 'أرشيف الكرتون الكلاسيكي العالمي',
    studio: 'أرشيف الكرتون الكلاسيكي العالمي',
    year: 1934,
    rating: 9.0,
    episodesCount: 25,
    synopsisAr: 'مجموعة مختارة من روائع الرسوم المتحركة الكلاسيكية المرممة بدقة 35 ملم من أرشيف الإنترنت.',
    posterUrl: 'https://archive.org/services/img/PantryPanic',
    backdropUrl: 'https://archive.org/services/img/PantryPanic',
    mediaType: 'tv',
    archiveIds: ['PantryPanic'],
  },
  {
    id: 'vg-rare-historical-cartoons',
    titleAr: 'أرشيف الكرتون التاريخي النادر (1930–1955)',
    titleEn: 'Historical & Rare Vintage Animation Anthology',
    planet: 'global',
    planetLabelAr: 'أرشيف الكرتون الكلاسيكي العالمي',
    studio: 'أرشيف الكرتون الكلاسيكي العالمي',
    year: 1943,
    rating: 8.9,
    episodesCount: 30,
    synopsisAr: 'مختارات تاريخية نادرة من عروض الكرتون السينمائية الكلاسيكية المحفوظة في أرشيف الإنترنت.',
    posterUrl: 'https://archive.org/services/img/VariousBannedAndCensoredCartoons',
    backdropUrl: 'https://archive.org/services/img/VariousBannedAndCensoredCartoons',
    mediaType: 'tv',
    archiveIds: ['VariousBannedAndCensoredCartoons'],
  },
];

export async function fetchFilmChestClassicCartoons(
  page = 1,
): Promise<CartoonSeriesItem[]> {
  const res = await searchArchiveCatalog({
    query: 'collection:classic_cartoons AND mediatype:movies',
    page,
    rows: 18,
  });
  return res.items.map((doc): CartoonSeriesItem => {
    const thumb = buildArchiveThumbnailUrl(doc.identifier);
    return {
      id: `vg-filmchest-${doc.identifier}`,
      titleAr: doc.title,
      titleEn: doc.title,
      planet: 'global',
      planetLabelAr: 'Film Chest 35mm Restored',
      studio: 'أرشيف الكرتون الكلاسيكي العالمي',
      year: Number(String(doc.year || '1940').slice(0, 4)) || 1940,
      rating: 9.0,
      episodesCount: 1,
      synopsisAr:
        doc.description ||
        'فيلم رسوم متحركة كلاسيكي مرمم من مجموعة Film Chest Vintage Cartoons.',
      posterUrl: thumb,
      backdropUrl: thumb,
      mediaType: 'movie',
      archiveIds: [doc.identifier],
    };
  });
}

export async function fetchGoldenAgeAnimationShorts(
  page = 1,
): Promise<CartoonSeriesItem[]> {
  const res = await searchArchiveCatalog({
    query:
      'collection:animationandcartoons AND (title:"Popeye" OR title:"Superman" OR title:"Betty Boop" OR title:"Felix" OR title:"Woody Woodpecker" OR title:"Looney" OR title:"Merrie Melodies") AND mediatype:movies',
    page,
    rows: 18,
  });
  const seeded = page === 1 ? VINTAGE_GLOBAL_SEEDED_CARTOONS : [];
  const dynamic = res.items.map((doc): CartoonSeriesItem => {
    const thumb = buildArchiveThumbnailUrl(doc.identifier);
    return {
      id: `vg-golden-${doc.identifier}`,
      titleAr: doc.title,
      titleEn: doc.title,
      planet: 'global',
      planetLabelAr: 'روائع الكرتون الكلاسيكي العالمي',
      studio: 'أرشيف الكرتون الكلاسيكي العالمي',
      year: Number(String(doc.year || '1938').slice(0, 4)) || 1938,
      rating: 9.1,
      episodesCount: 1,
      synopsisAr:
        doc.description ||
        'عرض كرتوني كلاسيكي من العصر الذهبي للرسوم المتحركة.',
      posterUrl: thumb,
      backdropUrl: thumb,
      mediaType: 'movie',
      archiveIds: [doc.identifier],
    };
  });
  return [...seeded, ...dynamic];
}
