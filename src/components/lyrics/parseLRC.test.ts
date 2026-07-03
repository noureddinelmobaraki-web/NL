import { describe, it, expect } from 'vitest';
import { parseLRC, parseLRCWithMeta } from './parseLRC';

describe('parseLRC — basics', () => {
  it('returns empty array for empty string', () => {
    expect(parseLRC('')).toEqual([]);
  });
  it('returns empty array for whitespace-only input', () => {
    expect(parseLRC('   \n  \n  ')).toEqual([]);
  });
  it('parses a single valid LRC line', () => {
    const r = parseLRC('[00:01.50]Hello');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ time: 1.5, text: 'Hello' });
    expect(r[0].endTime).toBe(Infinity);
  });
  it('ignores a line without a timestamp', () => {
    expect(parseLRC('Just some text')).toEqual([]);
  });
  it('strips a leading BOM', () => {
    const r = parseLRC('\uFEFF[00:02.00]After BOM');
    expect(r[0].text).toBe('After BOM');
  });
  it('normalises CRLF line endings', () => {
    const r = parseLRC('[00:00.00]A\r\n[00:01.00]B\r\n');
    expect(r.map((l) => l.text)).toEqual(['A', 'B']);
  });
});

describe('parseLRC — Enhanced (per-word timestamps)', () => {
  it('preserves the merged sentence text', () => {
    expect(parseLRC('[00:29.42]W <00:29.98>jouj')[0].text).toBe('W jouj');
  });
  it('extracts per-word timestamps', () => {
    const r = parseLRC('[00:29.42]W <00:29.98>jouj');
    expect(r[0].words).toHaveLength(2);
    expect(r[0].words?.[1].time).toBeCloseTo(29.98, 3);
  });
  it('caps per-word duration at 3 seconds', () => {
    const r = parseLRC('[00:00.00]Hello <00:00.50>orphan');
    expect(r[0].words?.[1].endTime).toBeCloseTo(3.5, 3);
  });
  it('computes per-word endTime from next word', () => {
    const r = parseLRC('[00:00.00]A <00:00.30>B <00:00.60>C');
    expect(r[0].words?.[0].endTime).toBeCloseTo(0.3, 3);
    expect(r[0].words?.[1].endTime).toBeCloseTo(0.6, 3);
  });
});

describe('parseLRC — multi-timestamp lines', () => {
  it('expands [t1][t2]Line into two entries', () => {
    const r = parseLRC('[00:01.00][00:05.00]Chorus');
    expect(r).toHaveLength(2);
    expect(r[0].time).toBeCloseTo(1.0); expect(r[1].time).toBeCloseTo(5.0);
  });
  it('keeps output sorted by time even when sources are out of order', () => {
    const r = parseLRC('[00:05.00]Second\n[00:01.00]First');
    expect(r[0].text).toBe('First');
    expect(r[1].text).toBe('Second');
  });
});

describe('parseLRC — empty / instrumental lines', () => {
  it('preserves an instrumental break as empty-text entry', () => {
    const r = parseLRC('[00:00.00]Hello\n[00:30.00]\n[00:35.00]World');
    expect(r).toHaveLength(3);
    expect(r[1].time).toBeCloseTo(30.0);
    expect(r[1].text).toBe('');
  });
});

describe('parseLRC — translation tracks', () => {
  it('splits "Primary / Translation"', () => {
    const r = parseLRC('[00:01.00]Hello / Hello') as any[];
    expect(r[0].text).toBe('Hello');
    expect(r[0].translation).toBe('Hello');
  });
  it('leaves URLs containing slashes untouched', () => {
    const r = parseLRC('[00:01.00]https://example.com/path') as any[];
    expect(r[0].text).toBe('https://example.com/path');
    expect(r[0].translation).toBeUndefined();
  });
});

describe('parseLRCWithMeta — metadata + offset', () => {
  it('extracts standard metadata tags', () => {
    const doc = parseLRCWithMeta(
      '[ti:Song]\n[ar:Artist]\n[al:Album]\n[by:Editor]\n[00:01.00]Body',
    );
    expect(doc.metadata.title).toBe('Song');
    expect(doc.metadata.artist).toBe('Artist');
    expect(doc.metadata.album).toBe('Album');
    expect(doc.metadata.editor).toBe('Editor');
    expect(doc.lines).toHaveLength(1);
  });
  it('preserves unknown metadata tags in `extra`', () => {
    const doc = parseLRCWithMeta('[mood:happy]\n[00:00.00]A');
    expect(doc.metadata.extra.mood).toBe('happy');
  });
  it('applies a positive offset by shifting times later', () => {
    const doc = parseLRCWithMeta('[offset:500]\n[00:01.00]A');
    expect(doc.lines[0].time).toBeCloseTo(1.5, 3);
  });
  it('applies a negative offset but clamps to >= 0', () => {
    const doc = parseLRCWithMeta('[offset:-2000]\n[00:01.00]A');
    expect(doc.lines[0].time).toBe(0);
  });
});

describe('parseLRC — robustness', () => {
  it('tolerates tabs and non-breaking spaces around timestamps', () => {
    const r = parseLRC('\t[00:01.00]\u00A0Hello\u00A0World');
    expect(r[0].text).toBe('Hello World');
  });
  it('skips comment lines that lack a timestamp', () => {
    const r = parseLRC('# this is a comment\n[00:01.00]Visible');
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe('Visible');
  });
});
