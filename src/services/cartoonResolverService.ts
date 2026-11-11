export interface ArchivePlayableEpisode {
  episode: number;
  title: string;
  mp4Url: string;
  sizeMB: string;
}

/**
 * Fetches playable MP4 episodes directly from an Internet Archive item identifier.
 */
export async function resolveArchiveOrgSeries(
  identifier: string
): Promise<ArchivePlayableEpisode[]> {
  if (!identifier) return [];
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) return [];
  const meta = await res.json();
  const files: any[] = meta.files || [];

  const mp4Files = files
    .filter((f) => f?.name && /\.(mp4|mkv)$/i.test(f.name) && f.source === 'original')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return mp4Files.map((file, idx) => ({
    episode: idx + 1,
    title: file.title || file.name.replace(/\.(mp4|mkv)$/i, ''),
    mp4Url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`,
    sizeMB: file.size ? (Number(file.size) / 1048576).toFixed(1) : 'Unknown',
  }));
}
