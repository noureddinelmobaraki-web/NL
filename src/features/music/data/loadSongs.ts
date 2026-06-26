import { RawSongFv, Track } from '../engine/types';

function getHashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 75%, 40%)`;
}

// Real durations in seconds (extracted with ffprobe)
const FV_DURATIONS: Record<number, number> = {
  1: 223, 2: 287, 3: 257, 4: 252, 5: 155, 6: 302, 7: 204, 8: 326, 9: 261, 10: 241,
  11: 171, 12: 209, 13: 225, 14: 201, 15: 173, 16: 218, 17: 121, 18: 168, 19: 184, 20: 150,
  21: 183, 22: 215, 23: 192, 24: 580, 25: 258, 26: 367, 27: 95, 28: 230, 29: 298, 30: 188,
  31: 306, 32: 171, 33: 173, 34: 202, 35: 237, 36: 103, 37: 79, 38: 218, 39: 394, 40: 287,
  41: 294, 42: 258, 43: 168, 44: 172, 45: 231, 46: 273, 47: 191, 48: 282, 49: 193, 50: 178,
  51: 219, 52: 227, 53: 208, 54: 146, 55: 152, 56: 273, 57: 235, 58: 257, 59: 180, 60: 298,
  61: 263, 62: 165, 63: 257, 64: 167, 65: 180, 66: 166, 67: 284, 68: 141, 69: 123, 70: 247,
  71: 350, 72: 217, 73: 125, 74: 288, 75: 233, 76: 153, 77: 245, 78: 299, 79: 213, 80: 258,
  81: 215, 82: 219, 83: 93, 84: 182, 85: 188, 86: 337, 87: 301, 88: 203, 89: 211, 90: 389,
  91: 515, 92: 236, 93: 227, 94: 293, 95: 230, 96: 209, 97: 270, 98: 213, 99: 118, 100: 223,
  101: 168, 102: 212, 103: 279, 104: 147, 105: 208, 106: 184, 107: 132, 108: 186, 109: 80, 110: 160,
  111: 308, 112: 373, 113: 162, 114: 372, 115: 187, 116: 159,
};

export async function loadFvTracks(): Promise<Track[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/nl-music-fv.json`);
    if (!response.ok) {
      throw new Error(`Failed to load nl-music-fv.json: ${response.statusText}`);
    }
    const data: RawSongFv[] = await response.json();
    return data.map((r) => {
      const trackId = `fv-${r.id}`;
      const lrcUrl = r.hasLrc && r.lrcFile 
        ? `${import.meta.env.BASE_URL}lrc/${r.lrcFile}` 
        : undefined;
      
      return {
        id: trackId,
        title: r.title || "Unknown Track",
        artist: r.artist || "Unknown Artist",
        src: r.url,
        srcFallback: r.urlJsdelivr,
        kind: 'file',
        lrcUrl,
        hasLrc: r.hasLrc,
        coverColor: getHashColor(r.title),
        source: 'fv',
        durationSec: FV_DURATIONS[r.id] ?? undefined
      };
    });
  } catch (error) {
    console.error('[loadSongs] error loading track list', error);
    return [];
  }
}
