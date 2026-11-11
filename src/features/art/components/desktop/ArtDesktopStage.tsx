/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated Desktop Layout for Art Hub (ArtDesktopStage)
 */

import React from 'react';
import {
  ArrowLeft,
  Brush,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { ArtMuseumPiece, ArtTabId } from '../../types/art.types';

export interface ArtDesktopStageProps {
  activeTab: ArtTabId;
  onTabChange: (tab: ArtTabId) => void;
  onClose: () => void;
  children: React.ReactNode;
  inspectedPiece: ArtMuseumPiece | null;
  onCloseInspect: () => void;
}

const ART_TABS: Array<{
  id: ArtTabId;
  label: string;
  subtitle: string;
  icon: React.FC<{ size?: number; className?: string }>;
}> = [
  {
    id: 'photos',
    label: 'Photos & Museums',
    subtitle: 'المتاحف العالمية والصور الفوتوغرافية',
    icon: ImageIcon,
  },
  {
    id: 'drawings',
    label: 'My Drawings & Studio',
    subtitle: 'رسوماتي الخاصة واستوديو الرسم والبيكسل',
    icon: Brush,
  },
  {
    id: 'avatars',
    label: 'Avatars & Identity Lab',
    subtitle: 'معمل صناعة وتخصيص الأفاتار',
    icon: Sparkles,
  },
];

export const ArtDesktopStage: React.FC<ArtDesktopStageProps> = ({
  activeTab,
  onTabChange,
  onClose,
  children,
}) => {
  return (
    <div className="min-h-screen w-full bg-[#050811] text-white flex flex-col">
      {/* Desktop Glass Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white cursor-pointer transition-all"
            >
              <ArrowLeft size={16} />
              <span>العودة للانشر</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 border border-cyan-400/40 flex items-center justify-center">
                <Palette size={20} className="text-cyan-300" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">
                  NL Art & Museums Sanctuary
                </h1>
                <p className="text-xs text-slate-400">
                  المتاحف العالمية المفتوحة · رسوماتي الخاصة (My Drawings) · معمل الأفاتار
                </p>
              </div>
            </div>
          </div>

          {/* 3 Main Art Branch Tabs */}
          <nav className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
            {ART_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 border border-cyan-400/50 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? 'text-cyan-300' : 'text-slate-400'}
                  />
                  <div>
                    <div className="text-xs font-black">{t.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {t.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
};
