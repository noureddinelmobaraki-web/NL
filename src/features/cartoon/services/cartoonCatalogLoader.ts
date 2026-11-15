import type { ShelfDefinition } from '../../../services/catalog/CatalogOrchestrator';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { CartoonSeriesItem } from '../types/cartoon.types';
import { SPACETOON_ARCHIVE_REGISTRY } from './spacetoonArchiveRegistry';
import {
  adaptCartoonToCinemaItem,
  getCartoonNumericId,
} from '../adapters/cartoonToCinemaAdapter';
import { enrichCartoonCatalogPosters } from './cartoonMetadataClient';
import {
  buildArchiveDetailsUrl,
  buildArchiveTorrentUrl,
} from '../../../services/archive/archiveUrlBuilder';

function mapSeriesBatchToCinemaItems(
  list: CartoonSeriesItem[],
  baseOffset: number,
  registerSeries: (numId: number, item: CartoonSeriesItem) => void,
): CinemaItem[] {
  return list.map((series, idx) => {
    const stableIdx = baseOffset + idx;
    const numId = getCartoonNumericId(series, stableIdx);
    registerSeries(numId, series);
    const item = adaptCartoonToCinemaItem(series, stableIdx);
    const primaryArchive = series.archiveIds[0];
    return {
      ...item,
      id: numId,
      directDownloadUrl: primaryArchive
        ? `https://archive.org/details/${encodeURIComponent(primaryArchive)}`
        : undefined,
      torrentDownloadUrl: primaryArchive
        ? buildArchiveTorrentUrl(primaryArchive)
        : undefined,
      archivePageUrl: primaryArchive
        ? buildArchiveDetailsUrl(primaryArchive)
        : undefined,
    };
  });
}

export function createCartoonLazyShelves(
  registerSeries: (numId: number, item: CartoonSeriesItem) => void,
): ShelfDefinition<CinemaItem>[] {
  return [
    {
      id: 'cartoon-spacetoon-action-adventure',
      title: 'روائع كوكب أكشن ومغامرات (دبلجة مركز الزهرة الأصيلة)',
      fetcher: async (page) => {
        if (page > 1) return [];
        const subset = SPACETOON_ARCHIVE_REGISTRY.filter(
          (s) => s.planet === 'action' || s.planet === 'adventure',
        );
        const enriched = await enrichCartoonCatalogPosters(subset);
        return mapSeriesBatchToCinemaItems(enriched, 0, registerSeries);
      },
    },
    {
      id: 'cartoon-spacetoon-sports-zomoroda',
      title: 'كواكب رياضة وزمردة وعلوم وتاريخ وأبجد وبونبون',
      fetcher: async (page) => {
        if (page > 1) return [];
        const subset = SPACETOON_ARCHIVE_REGISTRY.filter(
          (s) => s.planet !== 'action' && s.planet !== 'adventure',
        );
        const enriched = await enrichCartoonCatalogPosters(subset);
        return mapSeriesBatchToCinemaItems(enriched, 100, registerSeries);
      },
    },
    {
      id: 'cartoon-zaman-classic',
      title: 'ذكريات كرتون زمان والزمن الجميل (الثمانينات والتسعينات)',
      fetcher: async (page) => {
        if (page > 1) return [];
        const mod = await import('../catalog/zamanClassicCatalog');
        const enriched = await enrichCartoonCatalogPosters(
          mod.ZAMAN_CLASSIC_CATALOG,
        );
        return mapSeriesBatchToCinemaItems(enriched, 200, registerSeries);
      },
    },
    {
      id: 'cartoon-space-power',
      title: 'حماس سبيس باور (Space Power) وأفلام الأنمي المدبلجة',
      fetcher: async (page) => {
        if (page > 1) return [];
        const mod = await import('../catalog/spacePowerCatalog');
        const enriched = await enrichCartoonCatalogPosters(
          mod.SPACE_POWER_CATALOG,
        );
        return mapSeriesBatchToCinemaItems(enriched, 300, registerSeries);
      },
    },
    {
      id: 'cartoon-mbc3-action',
      title: 'روائع شاشة MBC 3 الكلاسيكية (يوغي يو، جاكي شان، الجاسوسات)',
      fetcher: async (page) => {
        if (page > 1) return [];
        const mod = await import('../catalog/mbc3ActionCatalog');
        const enriched = await enrichCartoonCatalogPosters(
          mod.MBC3_ACTION_CATALOG,
        );
        return mapSeriesBatchToCinemaItems(enriched, 400, registerSeries);
      },
    },
    {
      id: 'cartoon-nick-cn-arabic',
      title: 'نيكلوديون وكرتون نتورك وديزني بالعربية (سبونج بوب، بن 10، تيمون وبومبا)',
      fetcher: async (page) => {
        if (page > 1) return [];
        const mod = await import('../catalog/nickCnArabicCatalog');
        const enriched = await enrichCartoonCatalogPosters(
          mod.NICK_CN_ARABIC_CATALOG,
        );
        return mapSeriesBatchToCinemaItems(enriched, 500, registerSeries);
      },
    },
    {
      id: 'cartoon-jeem-baraem-semsem',
      title: 'براعم وتلفزيون جيم وأجيال وافتح يا سمسم والمناهل',
      fetcher: async (page) => {
        if (page > 1) return [];
        const mod = await import('../catalog/jeemAjyalSemsemCatalog');
        const enriched = await enrichCartoonCatalogPosters(
          mod.JEEM_AJYAL_SEMSEM_CATALOG,
        );
        return mapSeriesBatchToCinemaItems(enriched, 600, registerSeries);
      },
    },
    {
      id: 'cartoon-vintage-film-chest',
      title: 'روائع الكرتون الكلاسيكي العالمي المرمم (Film Chest 35mm & Golden Age)',
      fetcher: async (page) => {
        const mod = await import('../catalog/vintageGlobalCartoonCatalog');
        const [golden, filmChest] = await Promise.all([
          mod.fetchGoldenAgeAnimationShorts(page),
          mod.fetchFilmChestClassicCartoons(page),
        ]);
        return mapSeriesBatchToCinemaItems(
          [...golden, ...filmChest],
          700 + page * 50,
          registerSeries,
        );
      },
    },
  ];
}
