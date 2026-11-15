import type {
  SharatArtistGroupId,
  SharatTrack,
} from '../types/sharat.types';
import { SHARAT_TOP_CLASSICS_DATA } from '../data/sharatTopClassicsData';
import { SHARAT_SPACETOON_EXTENDED_DATA } from '../data/sharatSpacetoonExtendedData';
import { SHARAT_GOLDEN_ERA_DATA } from '../data/sharatGoldenEraData';
import { SHARAT_MBC3_CN_NICK_DATA } from '../data/sharatMbc3CnNickData';

export const SHARAT_VERIFIED_CATALOG: SharatTrack[] = [
  ...SHARAT_TOP_CLASSICS_DATA,
  ...SHARAT_SPACETOON_EXTENDED_DATA,
  ...SHARAT_GOLDEN_ERA_DATA,
  ...SHARAT_MBC3_CN_NICK_DATA,
].sort((a, b) => (a.priorityRank ?? 500) - (b.priorityRank ?? 500));

export const SHARAT_ARTIST_PILLS: Array<{
  id: SharatArtistGroupId;
  labelAr: string;
}> = [
  { id: 'all', labelAr: 'الكل (119+)' },
  { id: 'top_classics', labelAr: 'الأشهر والأقوى (25)' },
  { id: 'rasha', labelAr: 'رشا رزق' },
  { id: 'tarek', labelAr: 'طارق العربي طرقان' },
  { id: 'assem', labelAr: 'عاصم سكر' },
  { id: 'hala', labelAr: 'هالة الصباغ' },
  { id: 'sammy', labelAr: 'سامي كلارك' },
  { id: 'sonia', labelAr: 'سونيا بيطار' },
  { id: 'aida', labelAr: 'عايدة أبو نوار' },
  { id: 'bessam', labelAr: 'بسام الحسوني' },
  { id: 'samir', labelAr: 'سمير قصيباتي' },
  { id: 'tala_mohammed', labelAr: 'طلال ومحمد طرقان' },
  { id: 'zaman_jamil', labelAr: 'الزمن الجميل (70s–90s)' },
  { id: 'mbc3_cn_nick', labelAr: 'MBC 3 / كرتون نتورك / نيكلوديون' },
];

