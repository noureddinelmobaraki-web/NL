export interface CrossMappedAnimeIds {
  anilistId: number;
  malId?: number;
  tmdbId?: number;
  imdbId?: string;
  tvdbId?: number;
  episodes: Record<string, any>;
}

export async function resolveAnimeCrossIds(anilistId: number): Promise<CrossMappedAnimeIds> {
  try {
    const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      anilistId,
      malId: data.mappings?.mal_id,
      tmdbId: data.mappings?.themoviedb_id,
      imdbId: data.mappings?.imdb_id,
      tvdbId: data.mappings?.thetvdb_id,
      episodes: data.episodes || {},
    };
  } catch {
    return { anilistId, episodes: {} };
  }
}

export async function fetchSeaDexBestRelease(anilistId: number) {
  try {
    const url = `https://releases.moe/api/collections/entries/records?filter=(alID=${anilistId})&expand=trs`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items?.[0]?.expand?.trs || [];
  } catch {
    return [];
  }
}

export async function fetchAniSkipIntervals(malId: number, episodeNumber: number) {
  try {
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=0`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}
