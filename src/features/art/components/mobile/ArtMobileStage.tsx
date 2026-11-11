/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Dedicated Mobile & iOS Safe-Area Native Layout for Art Hub (ArtMobileStage)
 */

import React from 'react';
import {
  ArrowLeft,
  Brush,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from 'lucide-react';
import type { ArtTabId } from '../../types/art.types';

export interface ArtMobileStageProps {
  activeTab: ArtTabId;
  onTabChange: (tab: ArtTabId) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const ArtMobileStage: React.FC<ArtMobileStageProps> = ({
  activeTab,
  onTabChange,
  onClose,
  children,
}) => {
  return (
    <div
      className="min-h-screen w-full bg-[#050811] text-white flex flex-col"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 84px)',
      }}
    >
      {/* Top Compact iOS Header */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-white"
        >
          <ArrowLeft size={15} />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2">
          <Palette size={17} className="text-cyan-400" />
          <span className="text-sm font-black tracking-tight">
            NL Art Sanctuary
          </span>
        </div>
      </header>

      {/* Scrollable Mobile Content */}
      <main className="flex-1 px-3.5 py-4 overflow-x-hidden">{children}</main>

      {/* Floating Bottom Liquid Glass Tab Bar for iOS / Mobile Thumb Reach */}
      <nav
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 12px) + 10px)' }}
        className="fixed left-3 right-3 z-40 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 p-1.5 grid grid-cols-3 gap-1.5 shadow-2xl"
      >
        <button
          type="button"
          onClick={() => onTabChange('photos')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition-all ${
            activeTab === 'photos'
              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
              : 'text-slate-400'
          }`}
        >
          <ImageIcon size={16} />
          <span className="mt-0.5">المتاحف والصور</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('drawings')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition-all ${
            activeTab === 'drawings'
              ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40'
              : 'text-slate-400'
          }`}
        >
          <Brush size={16} />
          <span className="mt-0.5">رسوماتي واستوديو</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('avatars')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[11px] font-bold transition-all ${
            activeTab === 'avatars'
              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
              : 'text-slate-400'
          }`}
        >
          <Sparkles size={16} />
          <span className="mt-0.5">معمل الأفاتار</span>
        </button>
      </nav>
    </div>
  );
};
