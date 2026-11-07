/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

import { Clock } from 'lucide-react';

interface ProfileActivityReportProps {
  listeningReport: any;
}

export function ProfileActivityReport({ listeningReport }: ProfileActivityReportProps) {
  if (!listeningReport) return null;

  return (
    <section className="profile-section">
      <h3 className="flex items-center gap-2" style={{ direction: 'rtl' }}>
        <Clock size={16} /> Activity Stats (Activity Stats)
      </h3>
      <div className="grid grid-cols-3 gap-3 my-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <span className="block text-md font-bold text-sky-400">
            {listeningReport.song_plays ?? listeningReport.songs_played ?? listeningReport.songs_count ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Songs listend</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center border-x border-white/10">
          <span className="block text-md font-bold text-red-400">
            {listeningReport.movie_plays ?? listeningReport.movies_played ?? listeningReport.movies_count ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Movies watched</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <span className="block text-md font-bold text-purple-400">
            {listeningReport.series_plays ?? listeningReport.series_played ?? listeningReport.series_count ?? 0}
          </span>
          <span className="text-[10px] text-zinc-400">Series watched</span>
        </div>
      </div>

      {Array.isArray(listeningReport.recent_plays) && listeningReport.recent_plays.length > 0 && (
        <div className="mt-4 space-y-2 text-right" style={{ direction: 'rtl' }}>
          <h4 className="text-xs font-bold text-zinc-300">Latest Activities (Recent Activity)</h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
            {listeningReport.recent_plays.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 text-[11px]">
                <span className="text-zinc-200 font-medium truncate max-w-[180px]">{p.title}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-400 uppercase">
                  {p.media_type === 'tv' ? 'Series' : p.media_type === 'movie' ? 'Movie' : 'Song'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
