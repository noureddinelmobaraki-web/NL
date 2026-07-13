export const SONG_LADDER_PAGE_SIZE = 6;

export interface SongIdentity {
  id: number;
}

export function getSongLadderPageCount(length: number): number {
  return Math.max(1, Math.ceil(Math.max(0, length) / SONG_LADDER_PAGE_SIZE));
}

export function clampSongLadderPage(page: number, length: number): number {
  const lastPage = getSongLadderPageCount(length) - 1;
  return Math.max(0, Math.min(lastPage, Math.trunc(page)));
}

export function sliceSongLadderPage<T>(songs: readonly T[], page: number): T[] {
  const safePage = clampSongLadderPage(page, songs.length);
  const start = safePage * SONG_LADDER_PAGE_SIZE;
  return songs.slice(start, start + SONG_LADDER_PAGE_SIZE);
}

export function getSongLadderPageForId<T extends SongIdentity>(
  songs: readonly T[],
  id: number | null,
): number | null {
  if (id === null) return null;
  const index = songs.findIndex((song) => song.id === id);
  return index < 0 ? null : Math.floor(index / SONG_LADDER_PAGE_SIZE);
}
