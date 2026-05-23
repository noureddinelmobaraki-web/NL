import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { StreamItem } from './types';
import { useDeviceType } from '../../../hooks/useDeviceType';

interface StreamSearchProps {
  streams: StreamItem[];
  onResults: (filtered: StreamItem[]) => void;
  theme: string;
  placeholder?: string;
}

function normalizeFuzzy(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic accents
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // keep words and numbers
    .replace(/\s+/g, ' ')
    .trim();
}

function getLevenDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function dynamicFuzzyMatch(name: string, query: string): boolean {
  const normName = normalizeFuzzy(name);
  const normQuery = normalizeFuzzy(query);

  if (!normQuery) return true;
  if (normName.includes(normQuery)) return true;

  const nameWords = normName.split(' ');
  const queryWords = normQuery.split(' ');

  return queryWords.every((qw) => {
    return nameWords.some((nw) => {
      if (nw.includes(qw) || qw.includes(nw)) return true;
      const dist = getLevenDistance(nw, qw);
      const tolerance = qw.length > 5 ? 2 : qw.length >= 3 ? 1 : 0;
      return dist <= tolerance;
    });
  });
}

export function StreamSearch({ streams, onResults, theme, placeholder = 'بحث ذكي بالأقسام والروابط...' }: StreamSearchProps) {
  const { isMobile } = useDeviceType();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      onResults(streams);
    } else {
      const filtered = streams.filter((s) => dynamicFuzzyMatch(s.name, query));
      onResults(filtered);
    }
  }, [searchQuery, streams, onResults]);

  // Clean query on category swap if outer streams list updates are triggered
  useEffect(() => {
    setSearchQuery('');
  }, [streams]);

  return (
    <div className={`border-b p-2 flex flex-col gap-1.5 flex-shrink-0 w-full ${
      theme === 'dark' ? 'bg-[#151515] border-[#1f1f1f]' : 
      theme === 'bit' ? 'bg-[#2d1b69] border-[#ff00ff]' : 
      theme === 'midnight' ? 'bg-[#101f30] border-[#1e3a5f]' : 'bg-zinc-300 border-zinc-400'
    }`}>
      <div className={`flex items-center p-1 rounded border-2 ${
        isMobile ? 'h-11 px-3' : 'h-8'
      } ${
        theme === 'dark' ? 'bg-[#050505] border-[#333]' : 
        theme === 'bit' ? 'bg-[#120b25] border-[#00ffff]' : 
        theme === 'midnight' ? 'bg-[#040a12] border-[#1e3a5f]' : 'bg-white border-zinc-500'
      }`}>
        <Search className={`mr-1 ${isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${
          theme === 'dark' ? 'text-[#B8FF3F]' : 
          theme === 'bit' ? 'text-[#00ffff]' : 
          theme === 'midnight' ? 'text-[#60a5fa]' : 'text-zinc-500'
        }`} />
        <input
          type="text"
          dir="auto"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`bg-transparent border-none outline-none text-xs w-full font-sans ${
            theme === 'dark' ? 'text-[#B8FF3F] placeholder-[#B8FF3F]/30' : 
            theme === 'bit' ? 'text-[#00ffff] placeholder-[#00ffff]/40 font-mono' : 
            theme === 'midnight' ? 'text-[#60a5fa] placeholder-[#1e3a5f]' : 'text-zinc-900'
          }`}
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')} 
            className="p-1 flex items-center justify-center rounded-sm"
            style={isMobile ? { minWidth: '44px', minHeight: '44px' } : {}}
          >
            <X className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          </button>
        )}
      </div>
    </div>
  );
}
