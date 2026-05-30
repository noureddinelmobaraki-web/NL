import { memo } from 'react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { OsWindow } from '../OsWindow';
import { CrossfadeImage } from './CrossfadeImage';

export const VideoPreview = memo(({ index }: { index: number }) => {
  const resolvedTheme = useResolvedTheme();
  const renderContent = () => (
    <div className={`w-full aspect-[9/16] bg-[var(--bg-glass)] cursor-pointer relative group overflow-hidden ${resolvedTheme === 'light' ? '' : 'rounded-[8px] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500'} ${resolvedTheme === 'dark' ? 'bg-white/[0.03]' : ''}`}>
      <CrossfadeImage />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none'
      }} />
      <div className="absolute bottom-2 left-3">
        <span className="text-white text-[10px] font-mono font-bold tracking-widest opacity-80">
          {(index + 1).toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );

  if (resolvedTheme === 'light') {
    return (
      <OsWindow title={`drawing_${index + 1}.preview`} className="h-full">
        {renderContent()}
      </OsWindow>
    );
  }
  return renderContent();
});
