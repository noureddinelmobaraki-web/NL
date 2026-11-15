import type { ShelfDefinition } from '../../../services/catalog/CatalogOrchestrator';
import type { CinemaItem } from '../../../components/Movies/moviesDataClient';
import type { AnimeItem } from '../types/anime.types';
import {
  CURATED_ARABIC_DUB_ANIME,
  fetchJikanEndpoint,
} from '../services/animeCatalogClient';
import {
  adaptAnimeItemToCinemaItem,
  getAnimeNumericId,
} from '../adapters/animeToCinemaAdapter';
import { searchArchiveCatalog } from '../../../services/archive/archiveMasterEngine';
import {
  buildArchiveDetailsUrl,
  buildArchiveThumbnailUrl,
  buildArchiveTorrentUrl,
} from '../../../services/archive/archiveUrlBuilder';

const ANILIST_GQL = 'https://graphql.anilist.co';

function mapAniListNode(media: any): AnimeItem {
  const anilistId = Number(media?.id) || undefined;
  const malId = Number(media?.idMal) || undefined;
  const poster = media?.coverImage?.extraLarge || media?.coverImage?.large || '';
  const banner = media?.bannerImage || poster;
  const rawScore = Number(media?.averageScore);
  const score =
    Number.isFinite(rawScore) && rawScore > 0
      ? Number((rawScore / 10).toFixed(2))
      : 8.2;
  const cleanDesc = String(media?.description || '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return {
    id: malId ? `mal-${malId}` : `al-${anilistId}`,
    malId,
    anilistId,
    title: media?.title?.english || media?.title?.romaji || 'Anime',
    titleRomaji: media?.title?.romaji || undefined,
    titleNative: media?.title?.native || undefined,
    synopsis: cleanDesc || 'No synopsis available.',
    posterUrl: poster,
    bannerUrl: banner,
    trailerYoutubeId:
      media?.trailer?.site === 'youtube' ? media?.trailer?.id : undefined,
    score,
    episodesCount:
      Number(media?.episodes || media?.nextAiringEpisode?.episode - 1) || 12,
    status: media?.status === 'RELEASING' ? 'AIRING' : 'FINISHED',
    format: media?.format === 'MOVIE' ? 'MOVIE' : 'TV',
    year: Number(media?.seasonYear || media?.startDate?.year) || 2024,
    season: media?.season || undefined,
    studios: Array.isArray(media?.studios?.nodes)
      ? media.studios.nodes.map((s: any) => s.name).filter(Boolean)
      : [],
    genres: Array.isArray(media?.genres) ? media.genres : [],
    hasSub: true,
    hasDub: true,
  };
}

async function queryAniListShelf(
  variables: Record<string, any>,
  page: number,
  registerAnimeItem: (numId: number, item: AnimeItem) => void,
): Promise<CinemaItem[]> {
  const query = `
    query (
      $page: Int,
      $sort: [MediaSort],
      $status: MediaStatus,
      $format: MediaFormat,
      $genre_in: [String],
      $tag_in: [String],
      $averageScore_greater: Int,
      $startDate_greater: FuzzyDateInt,
      $startDate_lesser: FuzzyDateInt
    ) {
      Page(page: $page, perPage: 20) {
        media(
          type: ANIME,
          isAdult: false,
          sort: $sort,
          status: $status,
          format: $format,
          genre_in: $genre_in,
          tag_in: $tag_in,
          averageScore_greater: $averageScore_greater,
          startDate_greater: $startDate_greater,
          startDate_lesser: $startDate_lesser
        ) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          coverImage { extraLarge large }
          bannerImage
          averageScore
          episodes
          status
          format
          season
          seasonYear
          startDate { year }
          genres
          studios(isMain: true) { nodes { name } }
          trailer { id site }
          nextAiringEpisode { episode airingAt timeUntilAiring }
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { ...variables, page },
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list: AnimeItem[] = Array.isArray(json?.data?.Page?.media)
      ? json.data.Page.media.map(mapAniListNode)
      : [];
    return list.map((anime, idx) => {
      const numId = getAnimeNumericId(anime, idx);
      registerAnimeItem(numId, anime);
      return adaptAnimeItemToCinemaItem(anime, idx);
    });
  } catch {
    return [];
  }
}

export function createAnimeOrthogonalShelves(
  registerAnimeItem: (numId: number, item: AnimeItem) => void,
): ShelfDefinition<CinemaItem>[] {
  return [
    {
      id: 'anime-airing-trending',
      title: 'Airing & Trending This Season',
      fetcher: (page) =>
        queryAniListShelf(
          { status: 'RELEASING', sort: ['TRENDING_DESC'] },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-hall-of-fame',
      title: 'All-Time Hall of Fame (85%+ Score)',
      fetcher: (page) =>
        queryAniListShelf(
          { averageScore_greater: 85, sort: ['SCORE_DESC'] },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-battle-shonen',
      title: 'Battle Shonen & High-Energy Action',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Action', 'Adventure'],
            tag_in: ['Shounen'],
            sort: ['POPULARITY_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-dark-seinen',
      title: 'Dark Seinen, Psychological & Mind Games',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Thriller', 'Mystery', 'Psychological'],
            sort: ['SCORE_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-cyberpunk-mecha',
      title: 'Cyberpunk, Mecha & Hard Sci-Fi',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Sci-Fi', 'Mecha'],
            sort: ['POPULARITY_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-theatrical-films',
      title: 'Studio Ghibli & Prestige Theatrical Films',
      fetcher: (page) =>
        queryAniListShelf(
          {
            format: 'MOVIE',
            sort: ['SCORE_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-isekai-fantasy',
      title: 'Isekai & Epic Fantasy Worlds',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Fantasy'],
            tag_in: ['Isekai', 'Magic'],
            sort: ['POPULARITY_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-supernatural-urban',
      title: 'Supernatural, Curses & Urban Fantasy',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Supernatural'],
            sort: ['TRENDING_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-romance-slice',
      title: 'Romance, Drama & Slice of Life',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Romance', 'Slice of Life'],
            sort: ['SCORE_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-sports-competition',
      title: 'High-Stakes Sports & Competition',
      fetcher: (page) =>
        queryAniListShelf(
          {
            genre_in: ['Sports'],
            sort: ['SCORE_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-80s-90s-golden-cel',
      title: '80s & 90s Golden-Age Cel Animation Classics',
      fetcher: (page) =>
        queryAniListShelf(
          {
            startDate_greater: 19800000,
            startDate_lesser: 19991231,
            sort: ['POPULARITY_DESC'],
          },
          page,
          registerAnimeItem,
        ),
    },
    {
      id: 'anime-iconic-dub-classics',
      title: 'Iconic Global & Arabic Dubbed Classics',
      fetcher: async (page) => {
        if (page > 1) return [];
        return CURATED_ARABIC_DUB_ANIME.map((anime, idx) => {
          const numId = getAnimeNumericId(anime, idx);
          registerAnimeItem(numId, anime);
          return adaptAnimeItemToCinemaItem(anime, idx);
        });
      },
    },
    {
      id: 'anime-jikan-upcoming',
      title: 'Top Upcoming & Most Anticipated (MAL)',
      fetcher: async (page) => {
        const list = await fetchJikanEndpoint(
          `/seasons/upcoming?page=${page}&limit=20&sfw=true`,
        );
        return list.map((anime, idx) => {
          const numId = getAnimeNumericId(anime, idx + page * 100);
          registerAnimeItem(numId, anime);
          return adaptAnimeItemToCinemaItem(anime, idx + page * 100);
        });
      },
    },
    {
      id: 'anime-early-japanese-archive',
      title: 'Early Japanese Animated Film Classics (1917–1959 Public Domain)',
      fetcher: async (page) => {
        const res = await searchArchiveCatalog({
          query:
            'collection:animationandcartoons AND (subject:"Japan" OR subject:"Japanese" OR title:"Namakura" OR title:"Momotaro" OR description:"Japanese animation") AND mediatype:movies',
          page,
          rows: 16,
        });
        return res.items.map((doc, idx) => {
          const numId = 18_500_000 + page * 100 + idx;
          const thumb = buildArchiveThumbnailUrl(doc.identifier);
          const animeObj: AnimeItem = {
            id: `ia-jp-${doc.identifier}`,
            title: doc.title,
            synopsis:
              doc.description ||
              'Historic early Japanese animated short preserved in the Internet Archive.',
            posterUrl: thumb,
            bannerUrl: thumb,
            score: 7.8,
            episodesCount: 1,
            status: 'FINISHED',
            format: 'MOVIE',
            year: Number(String(doc.year || '1930').slice(0, 4)) || 1930,
            studios: [doc.creator || 'Early Japanese Animation Pioneers'],
            genres: ['Historical Anime', 'Archival Short'],
            hasSub: true,
            hasDub: false,
          };
          registerAnimeItem(numId, animeObj);
          const item = adaptAnimeItemToCinemaItem(animeObj, idx);
          return {
            ...item,
            id: numId,
            archiveIds: [doc.identifier],
            directDownloadUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
            torrentDownloadUrl: buildArchiveTorrentUrl(doc.identifier),
            archivePageUrl: buildArchiveDetailsUrl(doc.identifier),
          };
        });
      },
    },
  ];
}
