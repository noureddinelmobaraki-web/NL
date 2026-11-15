import type {
  SharatArtistGroupId,
  SharatTrack,
} from '../types/sharat.types';
import { SHARAT_RASHA_TAREK_CATALOG } from './sharatRashaTarekCatalog';
import { SHARAT_GOLDEN_VOICES_CATALOG } from './sharatGoldenVoicesCatalog';

export const SHARAT_VERIFIED_CATALOG: SharatTrack[] = [
  ...SHARAT_RASHA_TAREK_CATALOG,
  ...SHARAT_GOLDEN_VOICES_CATALOG,
];

export const SHARAT_ARTIST_PILLS: Array<{
  id: SharatArtistGroupId;
  labelAr: string;
}> = [
  { id: 'all', labelAr: 'الكل (53+)' },
  { id: 'rasha', labelAr: 'رشا رزق' },
  { id: 'tarek', labelAr: 'طارق العربي طرقان' },
  { id: 'hala', labelAr: 'هالة الصباغ' },
  { id: 'aida', labelAr: 'عايدة أبو نوار' },
  { id: 'sonia', labelAr: 'سونيا بيطار' },
  { id: 'sammy', labelAr: 'سامي كلارك' },
  { id: 'assem', labelAr: 'عاصم سكر' },
  { id: 'bessam', labelAr: 'بسام الحسوني' },
  { id: 'samir', labelAr: 'سمير قصيباتي' },
  { id: 'tala_mohammed', labelAr: 'طلال ومحمد طرقان' },
];
