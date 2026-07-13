import { describe, expect, it } from 'vitest';
import {
  SONG_LADDER_PAGE_SIZE,
  clampSongLadderPage,
  getSongLadderPageCount,
  getSongLadderPageForId,
  sliceSongLadderPage,
} from '../songLadderWindow';

const songs = Array.from({ length: 48 }, (_, index) => ({ id: index + 1 }));

describe('six-song ladder window', () => {
  it('uses an exact page size of six', () => {
    expect(SONG_LADDER_PAGE_SIZE).toBe(6);
    expect(getSongLadderPageCount(48)).toBe(8);
  });

  it('mounts only the requested six-song slice', () => {
    expect(sliceSongLadderPage(songs, 0).map((song) => song.id)).toEqual([1,2,3,4,5,6]);
    expect(sliceSongLadderPage(songs, 1).map((song) => song.id)).toEqual([7,8,9,10,11,12]);
    expect(sliceSongLadderPage(songs, 7).map((song) => song.id)).toEqual([43,44,45,46,47,48]);
  });

  it('clamps invalid pages safely', () => {
    expect(clampSongLadderPage(-5, 48)).toBe(0);
    expect(clampSongLadderPage(99, 48)).toBe(7);
  });

  it('finds the page containing an active song', () => {
    expect(getSongLadderPageForId(songs, 1)).toBe(0);
    expect(getSongLadderPageForId(songs, 7)).toBe(1);
    expect(getSongLadderPageForId(songs, 48)).toBe(7);
    expect(getSongLadderPageForId(songs, 999)).toBeNull();
  });
});
