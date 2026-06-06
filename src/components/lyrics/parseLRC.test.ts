import { describe, it, expect } from 'vitest';
import { parseLRC } from './parseLRC';

describe('parseLRC', () => {
  it('returns empty array for empty string', () => {
    expect(parseLRC('')).toEqual([]);
  });

  it('parses single valid LRC line', () => {
    const result = parseLRC('[00:01.50]Hello');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ time: 1.5, text: 'Hello' });
    expect(result[0].endTime).toBe(Infinity);
  });

  it('ignores line with no timestamp', () => {
    expect(parseLRC('Just some text')).toEqual([]);
  });
});
