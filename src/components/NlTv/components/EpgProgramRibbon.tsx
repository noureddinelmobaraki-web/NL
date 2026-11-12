import React from 'react';
import { Clock } from 'lucide-react';
import type { EpgNowNextProgram } from '../services/iptvOrgApiService';
import { GlassVectorIcon } from '../../shared/icons';

export interface EpgProgramRibbonProps {
  epg?: EpgNowNextProgram | null;
  program?: EpgNowNextProgram | null;
}

export const EpgProgramRibbon: React.FC<EpgProgramRibbonProps> = ({ epg, program }) => {
  const activeProgram = program ?? epg;
  if (!activeProgram) return null;

  return (
    <div className="w-full max-w-xl mx-auto px-4 mb-2 pointer-events-auto">
      <div className="rounded-2xl bg-neutral-950/70 backdrop-blur-md border border-white/10 px-4 py-2.5 flex flex-col gap-1.5 shadow-xl">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-sky-300 font-bold truncate">
            <GlassVectorIcon icon={Clock} theme="science" size={12} badge={false} />
            <span className="truncate">{activeProgram.nowTitle}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            {activeProgram.categoryLabel}
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-rose-500 transition-all duration-500"
            style={{ width: `${activeProgram.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
