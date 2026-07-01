import type { Track } from '../engine/types';

export function songShareUrl(track: Pick<Track, 'id'>): string {
  // track.id is like 'fv-123' → numeric part drives the static share page
  const num = String(track.id).replace(/^fv-/, '');
  const base = 'https://noureddinelmobaraki-web.github.io/NL';
  return `${base}/s/${num}.html`;
}

export async function shareSong(track: Track): Promise<'shared' | 'copied' | 'error'> {
  const url = songShareUrl(track);
  const title = `${track.title}${track.artist ? ' — ' + track.artist : ''}`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text: `استمع إلى ${track.title} على NL Music`, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    // user cancelled share OR clipboard blocked
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'error';
    }
  }
}
