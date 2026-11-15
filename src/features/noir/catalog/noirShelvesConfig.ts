import { searchArchiveCatalog } from '../../../services/archive/archiveMasterEngine';
import {
  buildArchiveDetailsUrl,
  buildArchiveThumbnailUrl,
  buildArchiveTorrentUrl,
} from '../../../services/archive/archiveUrlBuilder';
import type { ShelfDefinition } from '../../../services/catalog/CatalogOrchestrator';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { NoirFilmItem } from '../types/noir.types';
import { NOIR_ARCHIVE_REGISTRY } from '../services/noirArchiveRegistry';
import { adaptNoirFilmToCinemaItem } from '../services/noirStreamResolver';

function hashArchiveIdToNumber(identifier: string, offset = 0): number {
  let h = 2166136261;
  for (let i = 0; i < identifier.length; i++) {
    h ^= identifier.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 31_000_000 + offset + (Math.abs(h) % 8_000_000);
}

function mapDocToNoirCinemaItem(
  doc: {
    identifier: string;
    title: string;
    description?: string;
    year?: string;
    creator?: string;
    licenseurl?: string;
  },
  categoryLabel: string,
  shelfIdx: number,
): { cinemaItem: CinemaItem; filmItem: NoirFilmItem } {
  const numYear = Number(String(doc.year || '1948').slice(0, 4)) || 1948;
  const director = doc.creator || 'Archival Cinema Preservation';
  const synopsis =
    (doc.description || `${doc.title} — Preserved public-domain archival film.`)
      .replace(/<[^>]+>/g, '')
      .slice(0, 320);
  const thumb = buildArchiveThumbnailUrl(doc.identifier);

  const filmItem: NoirFilmItem = {
    id: `noir-dyn-${doc.identifier}`,
    title: doc.title,
    director,
    year: numYear,
    rating: 7.6,
    category: 'noir',
    categoryLabel,
    synopsis,
    posterUrl: thumb,
    backdropUrl: thumb,
    archiveId: doc.identifier,
  };

  const numId = hashArchiveIdToNumber(doc.identifier, shelfIdx * 100_000);
  const cinemaItem: CinemaItem = {
    id: numId,
    hub: 'noir',
    archiveIds: [doc.identifier],
    torrentDownloadUrl: buildArchiveTorrentUrl(doc.identifier),
    archivePageUrl: buildArchiveDetailsUrl(doc.identifier),
    licenseUrl: doc.licenseurl,
    usageRights: 'Public Domain / Open Archival Film',
    mediaType: 'movie',
    title: doc.title,
    overview: synopsis,
    posterPath: thumb,
    backdropPath: thumb,
    rating: 7.6,
    year: String(numYear),
    genreIds: [80, 9648, 36],
    genreNames: [categoryLabel, director],
    seasons: 1,
    episodes: 1,
    trailerKey: '',
    productionCompanies: [{ id: 1, name: director, logoPath: '' }],
    cast: [],
    similar: [],
  };

  return { cinemaItem, filmItem };
}

export function createNoirOrthogonalShelves(
  seededFilms: NoirFilmItem[],
  registerDynamicFilm: (numId: number, film: NoirFilmItem) => void,
): ShelfDefinition<CinemaItem>[] {
  const toSeededItems = (filterFn: (f: NoirFilmItem) => boolean): CinemaItem[] =>
    seededFilms
      .map((f, idx) => ({ f, idx }))
      .filter(({ f }) => filterFn(f))
      .map(({ f, idx }) => adaptNoirFilmToCinemaItem(f, idx));

  const queryShelf = (
    shelfIdx: number,
    id: string,
    title: string,
    categoryLabel: string,
    query: string,
    seededPred?: (f: NoirFilmItem) => boolean,
  ): ShelfDefinition<CinemaItem> => ({
    id,
    title,
    fetcher: async (page: number) => {
      const seeded =
        page === 1 && seededPred ? toSeededItems(seededPred) : [];
      const res = await searchArchiveCatalog({
        query,
        page,
        rows: 18,
        sort: 'downloads desc',
      });
      const dynamicItems = res.items.map((doc) => {
        const mapped = mapDocToNoirCinemaItem(doc, categoryLabel, shelfIdx);
        registerDynamicFilm(mapped.cinemaItem.id, mapped.filmItem);
        return mapped.cinemaItem;
      });
      return [...seeded, ...dynamicItems];
    },
  });

  return [
    queryShelf(
      1,
      'noir-essential-masterpieces',
      'Essential Film Noir Masterpieces (1941–1958)',
      'Essential Film Noir',
      'collection:feature_films AND (subject:"Film Noir" OR subject:"Noir" OR title:"Noir") AND mediatype:movies',
      (f) => f.category === 'noir',
    ),
    queryShelf(
      2,
      'noir-hardboiled-detective',
      'Hard-Boiled Detective & Crime Syndicates',
      'Hard-Boiled Crime',
      'collection:feature_films AND (subject:"crime" OR subject:"detective" OR subject:"murder" OR subject:"mystery") AND year:[1931 TO 1959] AND mediatype:movies',
    ),
    queryShelf(
      3,
      'noir-suspense-hitchcock',
      'Psychological Suspense & Hitchcockian Thrillers',
      'Suspense & Thriller',
      'collection:feature_films AND (creator:"Hitchcock" OR subject:"thriller" OR subject:"suspense" OR subject:"espionage") AND year:[1925 TO 1964] AND mediatype:movies',
      (f) => f.category === 'hitchcock_thriller',
    ),
    queryShelf(
      4,
      'noir-atomic-scifi-horror',
      'Atomic-Age Sci-Fi & B&W Cult Horror',
      'B&W Sci-Fi & Horror',
      '(collection:scifi_horror OR (collection:feature_films AND (subject:"horror" OR subject:"science fiction"))) AND year:[1920 TO 1969] AND mediatype:movies',
      (f) => f.category === 'horror_scifi',
    ),
    queryShelf(
      5,
      'noir-screwball-precode',
      'Golden-Age Screwball Comedy & Pre-Code Gems',
      'Classic Comedy & Pre-Code',
      '(collection:comedy_films OR (collection:feature_films AND subject:"comedy")) AND year:[1930 TO 1955] AND mediatype:movies',
      (f) => f.id === 'noir-his-girl-friday-1940',
    ),
    queryShelf(
      6,
      'noir-silent-pioneers',
      'Silent Era Pioneers & Expressionist Landmarks (1915–1930)',
      'Silent Era Cinema',
      '(collection:silent_films OR (collection:feature_films AND (subject:"silent" OR year:[1910 TO 1929]))) AND mediatype:movies',
      (f) => f.category === 'silent_comedy' && f.year <= 1930,
    ),
    queryShelf(
      7,
      'noir-prelinger-archives',
      'Prelinger Archives: Industrial, Educational & Ephemeral America',
      'Prelinger Archives',
      'collection:prelinger AND mediatype:movies',
    ),
    queryShelf(
      8,
      'noir-ephemeral-guidance',
      'Ephemeral Films & Classroom Social Guidance Classics',
      'Ephemeral & Social Guidance',
      'collection:ephemera AND mediatype:movies',
    ),
    queryShelf(
      9,
      'noir-historical-newsreels',
      'Universal & Historical Newsreels (1929–1967)',
      'Historical Newsreels',
      '(collection:universal_newsreels OR subject:"newsreels" OR subject:"newsreel") AND mediatype:movies',
    ),
    {
      id: 'noir-loc-wikimedia-vaults',
      title: 'Library of Congress & Public-Domain Film Vaults',
      fetcher: async (page: number) => {
        const vaults =
          page === 1
            ? toSeededItems((f) => f.category === 'vaults')
            : [];
        const [locRes, iaRes] = await Promise.allSettled([
          fetch(
            `https://www.loc.gov/film-and-videos/?fo=json&c=12&sp=${page}`,
            { signal: AbortSignal.timeout(6500) },
          ),
          searchArchiveCatalog({
            query:
              '(collection:library_of_congress OR collection:national_film_registry OR subject:"National Film Registry") AND mediatype:movies',
            page,
            rows: 14,
          }),
        ]);

        const items: CinemaItem[] = [...vaults];
        if (iaRes.status === 'fulfilled') {
          for (const doc of iaRes.value.items) {
            const mapped = mapDocToNoirCinemaItem(
              doc,
              'National Film Registry Archive',
              10,
            );
            registerDynamicFilm(mapped.cinemaItem.id, mapped.filmItem);
            items.push(mapped.cinemaItem);
          }
        }
        if (locRes.status === 'fulfilled' && locRes.value.ok) {
          try {
            const locData = await locRes.value.json();
            const results: any[] = Array.isArray(locData?.results)
              ? locData.results
              : [];
            for (const r of results.slice(0, 6)) {
              const title = String(r?.title || '').trim();
              if (!title) continue;
              const identifier = NOIR_ARCHIVE_REGISTRY[0].archiveId;
              const thumb =
                Array.isArray(r?.image_url) && r.image_url.length > 0
                  ? String(r.image_url[0])
                  : buildArchiveThumbnailUrl(identifier);
              const mapped = mapDocToNoirCinemaItem(
                {
                  identifier,
                  title,
                  description: Array.isArray(r?.description)
                    ? String(r.description[0])
                    : 'Preserved motion picture from the Library of Congress.',
                  year: String(r?.date || '1928').slice(0, 4),
                  creator: 'Library of Congress',
                },
                'Library of Congress Vault',
                11,
              );
              mapped.cinemaItem.posterPath = thumb;
              mapped.cinemaItem.backdropPath = thumb;
              mapped.filmItem.posterUrl = thumb;
              mapped.filmItem.backdropUrl = thumb;
              registerDynamicFilm(mapped.cinemaItem.id, mapped.filmItem);
              items.push(mapped.cinemaItem);
            }
          } catch {
            // ignore LOC parse error
          }
        }
        return items;
      },
    },
  ];
}
