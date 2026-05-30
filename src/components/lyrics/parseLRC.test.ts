import { describe, it, expect } from 'vitest';
import { parseLRC } from './parseLRC';

describe('parseLRC', () => {
  it('returns empty array for empty string', () => {
    expect(parseLRC('')).toEqual([]);
  });

  it('parses single valid LRC line', () => {
    expect(parseLRC('[00:01.50]Hello')).toEqual([{ time: 1.5, text: 'Hello' }]);
  });

  it('ignores line with no timestamp', () => {
    expect(parseLRC('Just some text')).toEqual([]);
  });
});
