import React, { useState } from 'react';
import { Sparkles, RefreshCw, Download } from 'lucide-react';
import { GlassVectorIcon } from '../../../components/shared/icons';

const DICEBEAR_STYLES = [
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'avataaars', label: 'Avataaars' },
  { id: 'bottts', label: 'Cyber Bots' },
  { id: 'lorelei', label: 'Lorelei Art' },
  { id: 'notionists', label: 'Notionists' },
  { id: 'pixel-art', label: 'Pixel Retro' },
] as const;

export const AvatarStudioGlassPanel: React.FC = () => {
  const [styleId, setStyleId] = useState<string>('adventurer');
  const [seed, setSeed] = useState<string>('NordineNL');

  const avatarUrl = `https://api.dicebear.com/9.x/${styleId}/svg?seed=${encodeURIComponent(
    seed || 'NL'
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <div className="max-w-3xl mx-auto my-6 p-6 rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col md:flex-row items-center gap-6">
      <div className="w-40 h-40 rounded-3xl overflow-hidden border-2 border-white/35 shadow-xl bg-slate-950 shrink-0 flex items-center justify-center">
        <img src={avatarUrl} alt={seed} className="w-full h-full object-contain" />
      </div>

      <div className="flex-1 space-y-4 w-full text-right" dir="rtl">
        <div className="flex items-center gap-2">
          <GlassVectorIcon icon={Sparkles} theme="bonbon" size={18} />
          <h3 className="text-lg font-black text-white">مختبر الأفاتار الزجاجي (SVG Vector Studio)</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {DICEBEAR_STYLES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStyleId(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                styleId === st.id
                  ? 'bg-sky-500/25 border-sky-300/60 text-white'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="اكتب اسماً أو رمزاً لتوليد الشخصية..."
            className="flex-1 px-4 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-white focus:outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={() => setSeed(`NL_${Math.random().toString(36).slice(2, 7)}`)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>عشوائي</span>
          </button>
          <a
            href={avatarUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`${seed}-avatar.svg`}
            className="px-3.5 py-2 rounded-xl bg-sky-500/80 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>SVG</span>
          </a>
        </div>
      </div>
    </div>
  );
};
