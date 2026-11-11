import React from 'react';
import { Tv, Radio, Satellite } from 'lucide-react';
import { GlassVectorIcon } from '../../shared/icons';

export type NlTvBroadcastMode = 'tv' | 'radio' | 'stremio';

export interface NlTvModeSwitcherProps {
  mode: NlTvBroadcastMode;
  onChangeMode: (next: NlTvBroadcastMode) => void;
}

export const NlTvModeSwitcher: React.FC<NlTvModeSwitcherProps> = ({ mode, onChangeMode }) => {
  const tabs: { id: NlTvBroadcastMode; label: string; icon: typeof Tv; theme: 'cosmic' | 'comedy' | 'emerald' }[] = [
    { id: 'tv', label: 'Live TV', icon: Tv, theme: 'cosmic' },
    { id: 'radio', label: 'Live Radio', icon: Radio, theme: 'comedy' },
    { id: 'stremio', label: 'Stremio HD', icon: Satellite, theme: 'emerald' },
  ];

  return (
    <div
      className="pointer-events-auto inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/75 backdrop-blur-xl border border-white/15 shadow-2xl"
      role="tablist"
      aria-label="Broadcast Mode"
    >
      {tabs.map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChangeMode(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              active
                ? 'bg-white/15 text-white border border-white/30 shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <GlassVectorIcon icon={tab.icon} theme={tab.theme} size={14} active={active} badge={false} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
