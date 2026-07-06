import raw from '../../../public/data/song-youtube.json';

const MAP = raw as Record<string, string>;

export function getSongYoutubeId(songId: number | string): string | null {
  const v = MAP[String(songId)];
  return v && v.trim().length > 0 ? v.trim() : null;
}
