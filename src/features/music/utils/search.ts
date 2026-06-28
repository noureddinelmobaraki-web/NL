export function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = b.charAt(j - 1) === a.charAt(i - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
    }
  }
  return matrix[a.length][b.length];
}

export function normalize(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    // Normalize Arabic
    .replace(/ـ/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    // Remove non-alphanumeric and extra spaces
    .replace(/[^a-z0-9ا-ي]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

import { Track } from '../engine/types';

export function scoreTrack(track: Track, query: string): number {
  const normQuery = normalize(query);
  if (!normQuery) return 0;
  
  const queryTokens = normQuery.split(' ');
  let totalScore = 0;
  let matchedAll = true;

  const fields = [
    { text: normalize(track.title), weight: 10 },
    { text: normalize(track.artist), weight: 8 },
    { text: normalize(track.album || ''), weight: 5 },
    { text: normalize(track.genre || ''), weight: 3 }
  ];

  for (const qToken of queryTokens) {
    let bestTokenScore = -Infinity;
    for (const field of fields) {
      if (!field.text) continue;
      if (field.text === normQuery) return 100; // Exact full match
      if (field.text.startsWith(normQuery)) return 90; // Starts with full query
      if (field.text.includes(normQuery)) return 80; // Includes full query
      
      const fieldTokens = field.text.split(' ');
      for (const fToken of fieldTokens) {
        if (fToken === qToken) {
          bestTokenScore = Math.max(bestTokenScore, field.weight * 5);
        } else if (fToken.startsWith(qToken)) {
          bestTokenScore = Math.max(bestTokenScore, field.weight * 3);
        } else {
          const maxDist = qToken.length <= 4 ? 1 : 2;
          const dist = levenshtein(qToken, fToken);
          if (dist <= maxDist) {
            bestTokenScore = Math.max(bestTokenScore, field.weight * (2 - dist));
          }
        }
      }
    }
    if (bestTokenScore === -Infinity) {
      matchedAll = false;
      break;
    }
    totalScore += bestTokenScore;
  }

  return matchedAll ? totalScore : -Infinity;
}

export function searchTracks(tracks: Track[], query: string): Track[] {
  if (!query || !query.trim()) return tracks;
  const scored = tracks.map(t => ({ track: t, score: scoreTrack(t, query) }));
  const filtered = scored.filter(s => s.score > -Infinity);
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.track.title.localeCompare(b.track.title);
  });
  return filtered.map(s => s.track);
}
