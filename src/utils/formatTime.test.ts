import { describe, it, expect } from 'vitest';
import { formatTime } from '../components/songs/formatTime';

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds less than 10 correctly', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats seconds over an hour correctly', () => {
    expect(formatTime(3600)).toBe('60:00');
  });
});
