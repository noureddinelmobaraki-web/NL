import type { SharatTrack } from '../types/sharat.types';
import { SHARAT_ACTION_MASTER_DATA } from '../data/sharatActionMasterData';
import { SHARAT_ADVENTURE_MASTER_DATA } from '../data/sharatAdventureMasterData';
import { SHARAT_SPORTS_MASTER_DATA } from '../data/sharatSportsMasterData';
import { SHARAT_ZUMURRODA_MASTER_DATA } from '../data/sharatZumurrodaMasterData';

export const SHARAT_VERIFIED_CATALOG: SharatTrack[] = [
  ...SHARAT_ACTION_MASTER_DATA,
  ...SHARAT_ADVENTURE_MASTER_DATA,
  ...SHARAT_SPORTS_MASTER_DATA,
  ...SHARAT_ZUMURRODA_MASTER_DATA,
];
