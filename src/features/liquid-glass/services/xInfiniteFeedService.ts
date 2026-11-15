import { LIQUID_GLASS_ALL_HLS_VIDEOS } from '../albumsData';
import {
  resolveArchiveItemMetadata,
  searchArchiveCatalog,
} from '../../../services/archive/archiveMasterEngine';

export interface XFeedVideoItem {
  id: string;
  tier: 1 | 2;
  type: 'hls' | 'mp4';
  streamUrl: string;
  mirrorUrl?: string;
}

const SEEN_STORAGE_KEY = 'nl_x_seen_clips_v2';

const TIER_2_ARCHIVE_POOLS: readonly string[] = [
  '(identifier:(Signal301959) OR subject:("Safety: Automotive") OR subject:("Driver education") OR title:("Signal 30")) AND mediatype:(movies)',
  '(collection:(prelinger) OR collection:(ephemera)) AND mediatype:(movies)',
  '(collection:(community_media) OR collection:(opensource_movies)) AND mediatype:(movies)',
  '(subject:("home movies") OR subject:(newsreels) OR collection:(home_movies)) AND mediatype:(movies)',
  'collection:(animationandcartoons) AND mediatype:(movies) AND year:[1920 TO 1965]',
];

function readSeenSet(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenSet(seen: Set<string>): void {
  try {
    const arr = Array.from(seen).slice(-400);
    window.sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function createShuffledIndices(total: number, lastIndex: number): number[] {
  const bag = Array.from({ length: total }, (_, i) => i);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  if (bag.length > 1 && bag[bag.length - 1] === lastIndex) {
    [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  return bag;
}

class XInfiniteFeedOrchestrator {
  private tier1Bag: number[] = [];
  private tier1Completed = false;
  private lastTier1Index = -1;
  private tier2ReadyQueue: XFeedVideoItem[] = [];
  private tier2CandidateIds: string[] = [];
  private poolCursor = 0;
  private harvesting = false;
  private seenIds: Set<string> =
    typeof window !== 'undefined' ? readSeenSet() : new Set();

  constructor() {
    this.tier1Bag = createShuffledIndices(
      LIQUID_GLASS_ALL_HLS_VIDEOS.length,
      -1,
    );
  }

  public getNextVideoSync(): XFeedVideoItem {
    // 1. Tier 1: All 46 personal R2 HLS videos play first without repetition
    if (!this.tier1Completed && this.tier1Bag.length > 0) {
      const idx = this.tier1Bag.pop()!;
      this.lastTier1Index = idx;
      if (this.tier1Bag.length <= 3) {
        void this.ensureTier2Prewarmed();
      }
      if (this.tier1Bag.length === 0) {
        this.tier1Completed = true;
      }
      return {
        id: `r2-hls-${idx}`,
        tier: 1,
        type: 'hls',
        streamUrl: LIQUID_GLASS_ALL_HLS_VIDEOS[idx],
      };
    }

    // 2. Tier 2: Pre-resolved infinite Archive.org / Wikimedia Commons MP4 stream
    if (this.tier2ReadyQueue.length > 0) {
      const nextClip = this.tier2ReadyQueue.shift()!;
      if (this.tier2ReadyQueue.length <= 3) {
        void this.ensureTier2Prewarmed();
      }
      return nextClip;
    }

    // 3. Instant fallback while Tier 2 is resolving in background
    void this.ensureTier2Prewarmed();
    if (this.tier1Bag.length === 0) {
      this.tier1Bag = createShuffledIndices(
        LIQUID_GLASS_ALL_HLS_VIDEOS.length,
        this.lastTier1Index,
      );
    }
    const fallbackIdx = this.tier1Bag.pop() ?? 0;
    return {
      id: `r2-hls-${fallbackIdx}`,
      tier: 1,
      type: 'hls',
      streamUrl: LIQUID_GLASS_ALL_HLS_VIDEOS[fallbackIdx],
    };
  }

  public async ensureTier2Prewarmed(): Promise<void> {
    if (this.harvesting || this.tier2ReadyQueue.length >= 5) return;
    this.harvesting = true;

    try {
      if (this.tier2CandidateIds.length < 6) {
        const poolIdx = this.poolCursor % (TIER_2_ARCHIVE_POOLS.length + 1);
        this.poolCursor += 1;

        if (poolIdx === TIER_2_ARCHIVE_POOLS.length) {
          await this.harvestWikimediaCommonsVideos();
        } else {
          const query = TIER_2_ARCHIVE_POOLS[poolIdx];
          const randomPage = Math.floor(Math.random() * 8) + 1;
          const res = await searchArchiveCatalog({
            query,
            page: randomPage,
            rows: 18,
            sort: 'downloads desc',
          });
          for (const doc of res.docs) {
            if (doc.identifier && !this.seenIds.has(doc.identifier)) {
              this.tier2CandidateIds.push(doc.identifier);
            }
          }
        }
      }

      // Pre-resolve direct .ia.mp4 stream URLs for the next 3 candidates
      while (
        this.tier2ReadyQueue.length < 4 &&
        this.tier2CandidateIds.length > 0
      ) {
        const candidateId = this.tier2CandidateIds.shift()!;
        if (this.seenIds.has(candidateId)) continue;
        this.seenIds.add(candidateId);
        saveSeenSet(this.seenIds);

        const meta = await resolveArchiveItemMetadata(candidateId);
        const video = meta?.videos?.[0];
        if (video) {
          this.tier2ReadyQueue.push({
            id: `ia-${candidateId}`,
            tier: 2,
            type: 'mp4',
            streamUrl: video.directNodeUrl || video.cdnStreamUrl,
            mirrorUrl: video.directNodeUrl ? video.cdnStreamUrl : undefined,
          });
        }
      }
    } catch {
      /* ignore background harvest errors */
    } finally {
      this.harvesting = false;
    }
  }

  private async harvestWikimediaCommonsVideos(): Promise<void> {
    try {
      const url =
        'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:video&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&format=json&origin=*';
      const res = await fetch(url, { signal: AbortSignal.timeout(6500) });
      if (!res.ok) return;
      const json = await res.json();
      const pages = Object.values(json?.query?.pages || {}) as Array<any>;
      for (const p of pages) {
        const info = p?.imageinfo?.[0];
        const fileUrl = String(info?.url || '');
        const mime = String(info?.mime || '');
        if (
          fileUrl &&
          (mime.includes('webm') || mime.includes('mp4') || mime.includes('ogg')) &&
          !this.seenIds.has(fileUrl)
        ) {
          this.seenIds.add(fileUrl);
          this.tier2ReadyQueue.push({
            id: `commons-${p.pageid}`,
            tier: 2,
            type: 'mp4',
            streamUrl: fileUrl,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
}

export const xInfiniteFeedEngine = new XInfiniteFeedOrchestrator();
