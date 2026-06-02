import { LyricLine, LyricWord } from '../../types';

function detectFormat(text: string): 'lrc' | 'sbv' | 'srt' {
  if (text.includes(' --> ')) return 'srt';
  if (/^\d+:\d{2}:\d{2}\.\d+,/m.test(text)) return 'sbv';
  return 'lrc';
}

function parseSBV(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    const parts = block.trim().split('\n');
    if (parts.length < 2) continue;
    const timeLine = parts[0].trim();
    const m = timeLine.match(/^(\d+):(\d{2}):(\d{2})\.(\d+),(\d+):(\d{2}):(\d{2})\.(\d+)/);
    if (!m) continue;
    
    const startTime = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
    const endTime = parseInt(m[5], 10) * 3600 + parseInt(m[6], 10) * 60 + parseInt(m[7], 10) + parseInt(m[8], 10) / 1000;
    
    const lyricText = parts.slice(1).join(' ').trim();
    if (lyricText) {
      lines.push({ time: startTime, endTime, text: lyricText });
    }
  }
  return lines;
}

function parseSRT(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    const parts = block.trim().split('\n');
    const timeLineIdx = parts.findIndex(p => p.includes(' --> '));
    if (timeLineIdx === -1) continue;
    const m = parts[timeLineIdx].match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!m) continue;

    const startTime = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
    const endTime = parseInt(m[5], 10) * 3600 + parseInt(m[6], 10) * 60 + parseInt(m[7], 10) + parseInt(m[8], 10) / 1000;
    
    const lyricText = parts.slice(timeLineIdx + 1).join(' ').trim();
    if (lyricText) {
      lines.push({ time: startTime, endTime, text: lyricText });
    }
  }
  return lines;
}

function parseLRCFormat(text: string): LyricLine[] {
  const result: LyricLine[] = [];
  const lines = text.split('\n');
  
  for (let rawLine of lines) {
    rawLine = rawLine.trim();
    if (!rawLine) continue;
    
    const m = rawLine.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!m) continue;
    
    const lineTime = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
    const rawText = m[3];
    const cleanText = rawText.replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
    
    const words: LyricWord[] = [];
    if (rawText.includes('<')) {
      let lastIndex = 0;
      let currentWordTime = lineTime;
      const tagRegex = /<(\d+):(\d+(?:\.\d+)?)>/g;
      let match;
      
      while ((match = tagRegex.exec(rawText)) !== null) {
        const matchIndex = match.index;
        const textChunk = rawText.substring(lastIndex, matchIndex);
        if (textChunk) {
          words.push({ text: textChunk.trim(), time: currentWordTime });
        }
        
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        currentWordTime = min * 60 + sec;
        
        lastIndex = tagRegex.lastIndex;
      }
      
      const lastChunk = rawText.substring(lastIndex);
      if (lastChunk) {
        words.push({ text: lastChunk.trim(), time: currentWordTime });
      }
    }
    
    result.push({
      time: lineTime,
      text: cleanText,
      ...(words.length > 0 ? { words } : {})
    });
  }
  
  return result;
}

export function parseLRC(text: string): LyricLine[] {
  if (!text) return [];
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const format = detectFormat(normalized);
  let parsed: LyricLine[] = [];
  try {
    if (format === 'sbv') {
      parsed = parseSBV(normalized);
    } else if (format === 'srt') {
      parsed = parseSRT(normalized);
    } else {
      parsed = parseLRCFormat(normalized);
    }
  } catch (err) {
    console.warn('Error parsing lyrics file:', err);
  }

  // Second pass: compute line endTimes and word endTimes
  for (let i = 0; i < parsed.length; i++) {
    const currentLine = parsed[i];
    if (currentLine.endTime === undefined) {
      if (i < parsed.length - 1) {
        currentLine.endTime = parsed[i + 1].time;
      } else {
        currentLine.endTime = Infinity;
      }
    }

    if (currentLine.words && currentLine.words.length > 0) {
      for (let w = 0; w < currentLine.words.length; w++) {
        const currentWord = currentLine.words[w];
        if (w < currentLine.words.length - 1) {
          currentWord.endTime = currentLine.words[w + 1].time;
        } else {
          currentWord.endTime = currentLine.endTime;
        }
        // Cap per-word duration to avoid orphan words hanging forever
        const MAX_WORD_DURATION = 3.0; // 3 seconds cap
        if (currentWord.endTime - currentWord.time > MAX_WORD_DURATION) {
          currentWord.endTime = currentWord.time + MAX_WORD_DURATION;
        }
      }
    }
  }

  return parsed;
}

export type { LyricLine };

// Test 1: parseLRC('[00:29.42]W <00:29.98>jouj')[0].text === 'W jouj'
// Test 2: parseLRC('[00:29.42]W <00:29.98>jouj')[0].words.length === 2
// Test 3: parseLRC('[00:29.42]W <00:29.98>jouj')[0].words[1].time === 29.98
