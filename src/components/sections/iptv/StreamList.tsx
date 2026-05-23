import { useState, useEffect, useRef } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { StreamItem } from './types';
import { useDeviceType } from '../../../hooks/useDeviceType';

interface StreamListProps {
  streams: StreamItem[];
  currentStreamId?: string;
  onPlay: (stream: StreamItem) => void;
  onHide: (id: string) => void;
  onEdit: (stream: StreamItem) => void;
  onDelete: (id: string) => void;
  theme: string;
}

function getLogoFallbackSvg(name: string, category: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue},40%,25%)`;
  const fg = `hsl(${hue},60%,70%)`;
  const icon = category === 'radio' ? '📻' : '📺';
  const initials = name.replace(/[^\w\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase();

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>
    <rect width='20' height='20' fill='${bg}' rx='2'/>
    <text x='10' y='13' text-anchor='middle' font-size='9'
      font-family='monospace' fill='${fg}'>${initials || icon}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function StreamList({
  streams,
  currentStreamId,
  onPlay,
  onEdit,
  onDelete,
  theme
}: StreamListProps) {
  const { isMobile } = useDeviceType();
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 600);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setScrollTop(0);
  }, [streams]);

  useEffect(() => {
    if (currentStreamId) {
      activeItemRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentStreamId]);

  const listHeight = isMobile ? Math.max(200, windowHeight - 320) : 340;
  const itemHeight = isMobile ? 54 : 44;

  const listBgStyle = 
    theme === 'dark' ? 'bg-[#080808] divide-[#1f1f1f]' : 
    theme === 'bit' ? 'bg-[#120b25] divide-[#ff00ff]/20' : 
    theme === 'midnight' ? 'bg-[#080f1a] divide-[#1e3a5f]/40' : 'bg-zinc-100 divide-zinc-200';

  const total = streams.length;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(total, visibleStart + Math.ceil(listHeight / itemHeight) + 3);
  const slicedItems = streams.slice(visibleStart, visibleEnd);
  const topSpacerHeight = visibleStart * itemHeight;
  const bottomSpacerHeight = Math.max(0, (total - visibleEnd) * itemHeight);

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full">
      <div 
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className={`flex-1 overflow-y-auto divide-y ${listBgStyle}`}
        style={{ height: `${listHeight}px` }}
      >
        {total === 0 ? (
          <div className={`p-4 text-center text-[10px] font-sans ${
            isMobile ? 'text-xs' : ''
          } ${
            theme === 'dark' ? 'text-zinc-500' : 
            theme === 'bit' ? 'text-[#00ffff]' : 
            theme === 'midnight' ? 'text-[#94a3b8]' : 'text-zinc-500'
          }`}>
            {theme === 'bit' ? 'NO CHANNELS FOUND' : 'لا توجد قنوات مطابقة.'}
          </div>
        ) : (
          <>
            <div style={{ height: `${topSpacerHeight}px` }} />
            {slicedItems.map(item => (
              <div
                key={item.id}
                ref={currentStreamId === item.id ? activeItemRef : null}
                onClick={() => onPlay(item)}
                className={`p-2 transition-colors cursor-pointer flex items-center justify-between group opacity-0 animate-fadeIn ${
                  currentStreamId === item.id 
                    ? (theme === 'dark' ? 'bg-[#B8FF3F] text-black font-bold' : 
                       theme === 'bit' ? 'bg-[#ff00ff] text-white font-black' : 
                       theme === 'midnight' ? 'bg-[#2563eb] text-white' : 'bg-blue-800 text-white')
                    : (theme === 'dark' ? 'hover:bg-[#151515] text-zinc-300' : 
                       theme === 'bit' ? 'hover:bg-[#ff00ff]/10 text-[#00ffff]' : 
                       theme === 'midnight' ? 'hover:bg-[#101f30] text-[#94a3b8]' : 'hover:bg-zinc-200 text-zinc-950')
                }`}
                style={{ height: `${itemHeight}px` }}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <img
                    loading="lazy"
                    src={item.logo}
                    alt=""
                    className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} object-contain bg-white rounded border border-zinc-300 flex-shrink-0`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getLogoFallbackSvg(item.name, item.category);
                    }}
                  />
                  <div className="min-w-0">
                    <div className={`font-bold truncate ${isMobile ? 'text-xs' : 'text-[11px]'} ${theme === 'bit' ? 'uppercase' : ''}`}>{item.name}</div>
                    <div className="text-[9px] truncate opacity-70">{item.group}</div>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1 transition-opacity ${
                  isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className={`p-1.5 rounded-sm ${
                      isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
                    } ${theme === 'dark' ? 'hover:bg-[#222]' : theme === 'bit' ? 'hover:bg-[#ff00ff]/20' : theme === 'midnight' ? 'hover:bg-[#101f30]' : 'hover:bg-zinc-400'}`}
                    title="تعديل"
                  >
                    <Edit3 className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} ${theme === 'dark' ? 'text-[#B8FF3F]' : theme === 'bit' ? 'text-[#00ffff]' : 'text-emerald-800'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className={`p-1.5 rounded-sm ${
                      isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
                    } ${theme === 'dark' ? 'hover:bg-[#222]' : theme === 'bit' ? 'hover:bg-[#ff00ff]/20' : theme === 'midnight' ? 'hover:bg-[#101f30]' : 'hover:bg-zinc-400'}`}
                    title="حذف"
                  >
                    <Trash2 className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-red-600`} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ height: `${bottomSpacerHeight}px` }} />
          </>
        )}
      </div>
    </div>
  );
}
