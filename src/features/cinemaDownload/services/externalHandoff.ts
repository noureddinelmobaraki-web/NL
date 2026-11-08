import type { DiscoveredReleaseOption } from '../types';

const PUBLIC_WSS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz'];
const PUBLIC_UDP = ['udp://tracker.opentrackr.org:1337/announce', 'udp://open.stealth.si:80/announce'];

export function buildHandoffMagnet(release: DiscoveredReleaseOption): string {
  try {
    const url = new URL(release.magnetUri);
    const existing = new Set(url.searchParams.getAll('tr'));
    for (const tr of [...PUBLIC_UDP, ...PUBLIC_WSS]) if (!existing.has(tr)) url.searchParams.append('tr', tr);
    if (!url.searchParams.get('dn')) url.searchParams.set('dn', release.cleanFileName);
    return url.toString().replace(/^magnet:\/\/?\??/, 'magnet:?');
  } catch {
    return release.magnetUri;
  }
}

export function openMagnetExternally(release: DiscoveredReleaseOption): void {
  const a = document.createElement('a');
  a.href = buildHandoffMagnet(release);
  a.rel = 'noopener';
  a.click();
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Returns true when a real .torrent was saved; false when only the magnet is available. */
export async function saveTorrentFile(
  release: DiscoveredReleaseOption,
  fetchCached: (url: string) => Promise<ArrayBuffer | null>,
): Promise<boolean> {
  const name = `${release.cleanFileName.replace(/\.[a-z0-9]{2,4}$/i, '')}.torrent`;
  if (release.rawTorrentBase64) {
    saveBlob(new Blob([base64ToBytes(release.rawTorrentBase64)], { type: 'application/x-bittorrent' }), name);
    return true;
  }
  for (const url of release.torrentCacheUrls.slice(0, 3)) {
    const buf = await fetchCached(url).catch(() => null);
    if (buf && buf.byteLength > 120 && new Uint8Array(buf)[0] === 0x64 /* 'd' */) {
      saveBlob(new Blob([buf], { type: 'application/x-bittorrent' }), name);
      return true;
    }
  }
  return false;
}

export async function copyMagnet(release: DiscoveredReleaseOption): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildHandoffMagnet(release));
    return true;
  } catch {
    return false;
  }
}

export async function shareMagnet(release: DiscoveredReleaseOption): Promise<boolean> {
  if (typeof navigator.share !== 'function') return copyMagnet(release);
  try {
    await navigator.share({ title: release.cleanFileName, text: buildHandoffMagnet(release) });
    return true;
  } catch {
    return false;
  }
}
