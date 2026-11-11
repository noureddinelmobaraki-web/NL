/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 *
 * Tab 3: Avatars & Identity Lab (DiceBear v9 9 Styles, RoboHash Sets 1..4, Waifu.pics SFW)
 */

import React from 'react';
import {
  Dices,
  Download,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAvatarCustomizer } from '../../hooks/useAvatarCustomizer';
import {
  DICEBEAR_STYLES,
  ROBOHASH_SETS,
} from '../../services/avatarGeneratorService';

export const AvatarsCreatorTab: React.FC = () => {
  const customizer = useAvatarCustomizer();
  const { config, setConfig, avatarUrl, loadingWaifu, randomizeSeed, refreshWaifu } =
    customizer;

  const BG_PRESETS = [
    '#0f172a',
    '#1e1b4b',
    '#064e3b',
    '#3b0764',
    '#451a03',
    '#38bdf8',
    '#f43f5e',
    '#10b981',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Avatar Live Preview Pedestal */}
      <div className="lg:col-span-5 flex flex-col items-center rounded-3xl bg-slate-900/85 border border-white/12 p-6 gap-5 shadow-2xl backdrop-blur-xl">
        <div
          className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-2 border-cyan-400/40 flex items-center justify-center shadow-2xl"
          style={{ backgroundColor: config.backgroundColor }}
        >
          {loadingWaifu ? (
            <RefreshCw size={28} className="animate-spin text-cyan-300" />
          ) : (
            <img
              src={avatarUrl}
              alt={config.seed}
              className="w-full h-full object-contain"
            />
          )}
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-[10px] font-bold uppercase text-cyan-200">
            {config.engine === 'dicebear'
              ? `DiceBear · ${config.dicebearStyle}`
              : config.engine === 'robohash'
                ? `RoboHash · ${config.robohashSet}`
                : `Waifu.pics · ${config.waifuCategory}`}
          </span>
        </div>

        <div className="w-full flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={randomizeSeed}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            <Dices size={15} className="text-cyan-300" />
            <span>توليد عشوائي (Randomize)</span>
          </button>

          <a
            href={avatarUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`NL-Avatar-${config.seed}.svg`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
          >
            <Download size={15} />
            <span>تحميل الأفاتار (SVG / PNG)</span>
          </a>
        </div>
      </div>

      {/* Customization Controls */}
      <div className="lg:col-span-7 rounded-3xl bg-slate-900/85 border border-white/12 p-5 sm:p-6 space-y-5 backdrop-blur-xl">
        {/* Engine Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'dicebear', label: 'DiceBear v9 Studio (9 أنماط)' },
            { id: 'robohash', label: 'RoboHash 3D & Cyber' },
            { id: 'waifu', label: 'Waifu.pics Anime Portraits' },
          ].map((eng) => (
            <button
              key={eng.id}
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  engine: eng.id as 'dicebear' | 'robohash' | 'waifu',
                }))
              }
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                config.engine === eng.id
                  ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Sparkles size={13} />
              <span>{eng.label}</span>
            </button>
          ))}
        </div>

        {/* Seed Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            الاسم أو البذرة النصية للأفاتار (Identity Seed):
          </label>
          <div className="relative">
            <UserCheck
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400"
            />
            <input
              type="text"
              value={config.seed}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, seed: e.target.value }))
              }
              placeholder="اكتب اسمك أو لقبك لتوليد هويتك البصرية..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Engine-Specific Styles */}
        {config.engine === 'dicebear' && (
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-300">
              اختر النمط الفني (DiceBear v9 Artistic Style):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {DICEBEAR_STYLES.map((st) => {
                const active = config.dicebearStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, dicebearStyle: st.id }))
                    }
                    className={`flex flex-col items-start p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs font-bold">{st.label}</span>
                    <span className="text-[10px] text-cyan-300/80 mt-0.5">
                      {st.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {config.engine === 'robohash' && (
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-300">
              اختر فئة RoboHash:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ROBOHASH_SETS.map((rs) => (
                <button
                  key={rs.id}
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, robohashSet: rs.id }))
                  }
                  className={`p-3 rounded-xl border text-xs font-bold cursor-pointer ${
                    config.robohashSet === rs.id
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-black/30 border-white/10 text-slate-300'
                  }`}
                >
                  {rs.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.engine === 'waifu' && (
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-300">
              اختر فئة بورتريه الأنمي (Waifu.pics SFW):
            </span>
            <div className="flex flex-wrap gap-2">
              {(['waifu', 'neko', 'shinobu', 'megumin'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, waifuCategory: cat }));
                    void refreshWaifu(cat);
                  }}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase cursor-pointer ${
                    config.waifuCategory === cat
                      ? 'bg-fuchsia-500/25 border-fuchsia-400 text-fuchsia-200'
                      : 'bg-black/30 border-white/10 text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background Color Picker */}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-300">
            لون الخلفية (Background Color):
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {BG_PRESETS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, backgroundColor: hex }))
                }
                className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform ${
                  config.backgroundColor === hex
                    ? 'scale-110 border-white'
                    : 'border-white/20'
                }`}
                style={{ backgroundColor: hex }}
                aria-label={hex}
              />
            ))}
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  backgroundColor: e.target.value,
                }))
              }
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
